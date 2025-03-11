"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../../utils/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Send, MessageSquare, UserCog } from "lucide-react";
import Header from "@/components/Header";
import Link from "next/link";

export default function PostsPage() {
  const [content, setContent] = useState("");
  const [posts, setPosts] = useState([]);
  const [allPosts, setAllPosts] = useState([]);
  const [viewMode, setViewMode] = useState("account"); // 'account' or 'feed'
  const [isLoading, setIsLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [ownerProfile, setOwnerProfile] = useState(null);
  const [isManagerMode, setIsManagerMode] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Get account ID from URL query parameter
  const accountId = searchParams.get("accountId");

  useEffect(() => {
    // This function handles all the setup and data fetching
    const initializePage = async () => {
      setPageLoading(true);
      console.log("Initializing posts page with accountId:", accountId);

      try {
        // Step 1: Get current user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) {
          router.push("/login-register");
          return;
        }
        setUser(user);
        console.log("Current user:", user.id);

        // Step 2: Check if we're in manager mode
        const effectiveAccountId = accountId || user.id;
        const inManagerMode = accountId && accountId !== user.id;
        setIsManagerMode(inManagerMode);
        console.log("Is manager mode:", inManagerMode);

        // Step 3: If in manager mode, verify access and get owner profile
        if (inManagerMode) {
          console.log("Fetching owner profile for:", accountId);

          // Get the account owner's profile
          const { data: ownerData, error: ownerError } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", accountId)
            .maybeSingle();

          if (ownerError && ownerError.code !== "PGRST116") {
            console.error("Error fetching owner profile:", ownerError);
          } else if (ownerData) {
            setOwnerProfile(ownerData);
            console.log("Owner profile:", ownerData);
          } else {
            console.log("Owner profile not found, using fallback");
            // Fallback if profile not found
            setOwnerProfile({
              full_name: `Account (${accountId.slice(0, 8)}...)`,
            });
          }

          // Verify manager has permission (try both ID and email-based lookup)
          console.log("Verifying management permission");
          const { data: accessData, error: accessError } = await supabase
            .from("account_access")
            .select("*")
            .eq("account_owner_id", accountId)
            .or(`manager_id.eq.${user.id},manager_email.ilike.%${user.email}%`)
            .maybeSingle();

          console.log("Access check result:", accessData, accessError);

          if (accessError || !accessData) {
            console.error("Access verification failed:", accessError);
            alert("You do not have permission to manage this account");
            router.push("/posts");
            return;
          }
        }

        // Step 4: Fetch posts for the effective account
        await fetchPosts(effectiveAccountId);

        // Step 5: Fetch all posts for the feed
        await fetchAllPosts();
      } catch (error) {
        console.error("Error initializing posts page:", error);
      } finally {
        setPageLoading(false);
      }
    };

    // Function to fetch posts for a specific account ID
    const fetchPosts = async (ownerId) => {
      try {
        console.log("Fetching posts for owner:", ownerId);

        // Fetch all posts for the account
        const { data: postsData, error: postsError } = await supabase
          .from("posts")
          .select("*")
          .eq("owner_id", ownerId)
          .order("created_at", { ascending: false });

        if (postsError) {
          console.error("Error fetching posts:", postsError);
          return;
        }

        console.log(`Found ${postsData?.length || 0} posts`);

        if (!postsData || postsData.length === 0) {
          setPosts([]);
          return;
        }

        // Get all user IDs from the posts to fetch profiles
        const userIds = [...new Set(postsData.map((post) => post.user_id))];

        // Fetch profiles for all post authors
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("*")
          .in("id", userIds);

        if (profilesError) {
          console.error("Error fetching author profiles:", profilesError);
        }

        // Get comment counts
        const postIds = postsData.map((post) => post.id);
        const { data: commentsData, error: commentsError } = await supabase
          .from("comments")
          .select("post_id")
          .in("post_id", postIds);

        if (commentsError) {
          console.error("Error fetching comments:", commentsError);
        }

        // Count comments
        const commentCounts = {};
        if (commentsData) {
          commentsData.forEach((comment) => {
            commentCounts[comment.post_id] =
              (commentCounts[comment.post_id] || 0) + 1;
          });
        }

        // Combine all data
        const enrichedPosts = postsData.map((post) => {
          // Find the author's profile
          const authorProfile = profilesData?.find(
            (profile) => profile.id === post.user_id
          );

          return {
            ...post,
            profile: authorProfile || null,
            commentCount: commentCounts[post.id] || 0,
          };
        });

        setPosts(enrichedPosts);
      } catch (error) {
        console.error("Unexpected error in fetchPosts:", error);
      }
    };

    // Function to fetch all posts for feed view
    // Function to fetch all posts for feed view
    const fetchAllPosts = async () => {
      try {
        console.log("Fetching all posts for feed view");

        // Use a more direct query with no filters
        const { data, error } = await supabase
          .from("posts")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);

        console.log("Raw posts data:", data);
        console.log("Error if any:", error);

        if (error) {
          console.error("Error fetching all posts:", error);
          return;
        }

        if (!data || data.length === 0) {
          console.log("No posts found in database");
          setAllPosts([]);
          return;
        }

        // Get all user IDs from the posts to fetch profiles
        const userIds = [
          ...new Set([
            ...data.map((post) => post.user_id),
            ...data.map((post) => post.owner_id),
          ]),
        ].filter((id) => id); // Remove null/undefined

        // Fetch profiles for all post authors and owners
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("*")
          .in("id", userIds);

        if (profilesError) {
          console.error("Error fetching profiles:", profilesError);
        }

        // Get comment counts
        const postIds = data.map((post) => post.id);
        const { data: commentsData, error: commentsError } = await supabase
          .from("comments")
          .select("post_id")
          .in("post_id", postIds);

        if (commentsError) {
          console.error("Error fetching comments:", commentsError);
        }

        // Count comments
        const commentCounts = {};
        if (commentsData) {
          commentsData.forEach((comment) => {
            commentCounts[comment.post_id] =
              (commentCounts[comment.post_id] || 0) + 1;
          });
        }

        // Combine all data
        const enrichedPosts = data.map((post) => {
          // Find the author's profile
          const authorProfile = profilesData?.find(
            (profile) => profile.id === post.user_id
          );

          // Find the owner's profile
          const ownerProfile = profilesData?.find(
            (profile) => profile.id === post.owner_id
          );

          return {
            ...post,
            profile: authorProfile || null, // Creator profile
            ownerProfile: ownerProfile || null, // Owner profile
            commentCount: commentCounts[post.id] || 0,
          };
        });

        console.log("Enriched all posts:", enrichedPosts.length);
        setAllPosts(enrichedPosts);
      } catch (error) {
        console.error("Unexpected error in fetchAllPosts:", error);
      }
    };

    // Run the initialization
    initializePage();

    // Set up realtime subscriptions for the current account
    if (user) {
      const effectiveId = accountId || user?.id;
      if (effectiveId) {
        const postsSubscription = supabase
          .channel("posts-channel")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "posts",
              filter: `owner_id=eq.${effectiveId}`,
            },
            () => {
              fetchPosts(effectiveId);
              fetchAllPosts();
            }
          )
          .subscribe();

        return () => {
          postsSubscription.unsubscribe();
        };
      }
    }
  }, [accountId, searchParams, supabase, router]);

  // Add this function to your component to directly test database access
  const testDatabaseAccess = async () => {
    console.log("Testing direct database access");

    try {
      // Test accessing posts table
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("*")
        .limit(10);

      console.log("Posts test:", {
        success: !postsError,
        error: postsError,
        count: postsData?.length || 0,
        sample: postsData?.slice(0, 2) || [],
      });

      // Test accessing profiles table
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .limit(10);

      console.log("Profiles test:", {
        success: !profilesError,
        error: profilesError,
        count: profilesData?.length || 0,
      });

      // Test accessing comments table
      const { data: commentsData, error: commentsError } = await supabase
        .from("comments")
        .select("*")
        .limit(10);

      console.log("Comments test:", {
        success: !commentsError,
        error: commentsError,
        count: commentsData?.length || 0,
      });

      // Add a button to run this test in your UI:
      // <button onClick={testDatabaseAccess} className="...">Test DB Access</button>
    } catch (error) {
      console.error("Database test error:", error);
    }
  };

  const createPost = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsLoading(true);

    try {
      // Determine the owner ID (whose account the post belongs to)
      const ownerId = accountId || user.id;

      console.log("Creating post as user", user.id, "for owner", ownerId);

      const { error } = await supabase.from("posts").insert({
        user_id: user.id, // Who created the post
        owner_id: ownerId, // Whose account it belongs to
        content,
      });

      if (error) {
        console.error("Error creating post:", error);
        throw error;
      }

      setContent("");
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Failed to create post. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle between account and feed views
  const toggleViewMode = () => {
    setViewMode(viewMode === "account" ? "feed" : "account");
  };

  // Determine which posts to display
  const displayPosts = viewMode === "account" ? posts : allPosts;

  if (pageLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
          <span className="ml-2 text-amber-600">Loading posts...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />

      {/* Manager Mode Banner */}
      {isManagerMode && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="container mx-auto px-4 py-2 flex items-center">
            <UserCog className="text-amber-600 mr-2" size={20} />
            <p className="text-amber-800">
              <span className="font-medium">Manager Mode:</span> You are
              managing posts for {ownerProfile?.full_name || "Account Owner"}.
            </p>
            <Link
              href="/manager-dashboard"
              className="ml-auto text-sm text-amber-700 hover:text-amber-800"
            >
              Switch Account
            </Link>
          </div>
        </div>
      )}

      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h1 className="text-2xl font-bold mb-2 md:mb-0">
            {viewMode === "account"
              ? isManagerMode
                ? `Posts for ${ownerProfile?.full_name || "Account Owner"}`
                : "My Posts"
              : "All Posts Feed"}
          </h1>

          {/* View toggle buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode("account")}
              className={`px-3 py-1 rounded-md ${
                viewMode === "account"
                  ? "bg-amber-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {isManagerMode ? "Account Posts" : "My Posts"}
            </button>
            <button
              onClick={() => setViewMode("feed")}
              className={`px-3 py-1 rounded-md ${
                viewMode === "feed"
                  ? "bg-amber-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              All Posts
            </button>
            <button
              onClick={testDatabaseAccess}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Test DB Access
            </button>
          </div>
        </div>

        {/* Create Post Form - only show in account view */}
        {viewMode === "account" && (
          <form
            onSubmit={createPost}
            className="mb-8 bg-white p-4 rounded-lg shadow"
          >
            <h2 className="text-xl font-semibold mb-4">
              {isManagerMode
                ? `Create Post for ${
                    ownerProfile?.full_name || "Account Owner"
                  }`
                : "Create a Post"}
            </h2>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full p-3 border rounded-md focus:ring-amber-500 focus:border-amber-500 min-h-[100px]"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !content.trim()}
              className="mt-3 px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:bg-amber-300 flex items-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 animate-spin" size={18} />
                  Posting...
                </>
              ) : (
                <>
                  <Send className="mr-2" size={18} />
                  Post
                  {isManagerMode
                    ? ` as ${ownerProfile?.full_name || "Owner"}`
                    : ""}
                </>
              )}
            </button>
          </form>
        )}

        {/* Posts List */}
        <div className="space-y-6">
          {displayPosts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">
                No posts yet
              </h3>
              <p className="mt-1 text-gray-500">
                {viewMode === "account"
                  ? isManagerMode
                    ? `Create the first post for ${
                        ownerProfile?.full_name || "this account"
                      }`
                    : "Get the conversation started by creating the first post"
                  : "No posts available in the feed yet"}
              </p>
            </div>
          ) : (
            displayPosts.map((post) => (
              <div key={post.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-medium">
                      {/* Show the account owner's name (not the creator's) */}
                      {ownerProfile?.full_name || "Account Owner: "}
                      {/* Optional: show who created it */}
                      {post.owner_id }
                    </h4>
                    <p className="text-sm text-gray-500">
                      {new Date(post.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <p className="mb-4">{post.content}</p>

                <button
                  onClick={() =>
                    router.push(
                      `/posts/${post.id}${
                        accountId && viewMode === "account"
                          ? `?accountId=${accountId}`
                          : ""
                      }`
                    )
                  }
                  className="text-amber-600 hover:text-amber-700 text-sm flex items-center"
                >
                  <MessageSquare size={16} className="mr-1" />
                  {post.commentCount} Comments - Click to view and reply
                </button>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
