"use client";

import { useState, useEffect, use } from "react";
import { createClient } from "../../../../utils/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Send, ArrowLeft, MessageSquare, UserCog } from "lucide-react";
import Header from "@/components/Header";
import Link from "next/link";

export default function PostDetail({ params }) {
  // Properly unwrap params
  const unwrappedParams = use(params);
  const id = unwrappedParams.id;

  const [post, setPost] = useState(null);
  const [commentContent, setCommentContent] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [ownerProfile, setOwnerProfile] = useState(null);
  const [isManagerMode, setIsManagerMode] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Get account ID from URL query parameter
  const accountId = searchParams.get("accountId");

  useEffect(() => {
    // Check if user is authenticated
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login-register");
        return;
      }
      setUser(user);

      // Check if we're in manager mode
      const inManagerMode = accountId && accountId !== user.id;
      setIsManagerMode(inManagerMode);

      if (inManagerMode) {
        // Fetch owner profile if in manager mode
        const { data: ownerData, error: ownerError } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", accountId)
          .maybeSingle();

        if (!ownerError && ownerData) {
          setOwnerProfile(ownerData);
        } else {
          setOwnerProfile({
            full_name: `Account (${accountId.slice(0, 8)}...)`,
          });
        }
      }
    };

    // Fetch post and comments
    const fetchPost = async () => {
      try {
        console.log("Fetching post with ID:", id);

        // Step 1: Fetch the specific post
        const { data: postData, error: postError } = await supabase
          .from("posts")
          .select("*")
          .eq("id", id)
          .single();

        if (postError) {
          console.error("Error fetching post:", postError);
          return;
        }

        console.log("Post data:", postData);

        // Step 2: Fetch the post author's profile
        const { data: authorProfile, error: authorError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", postData.user_id)
          .single();

        if (authorError) {
          console.error("Error fetching author profile:", authorError);
        }

        console.log("Author profile:", authorProfile);

        // Step 3: Fetch the post owner's profile (might be different from author)
        const { data: ownerProfile, error: ownerError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", postData.owner_id)
          .single();

        if (ownerError) {
          console.error("Error fetching owner profile:", ownerError);
        }

        console.log("Owner profile:", ownerProfile);

        // Step 4: Fetch all comments for this post
        let commentsData = [];
        const { data, error: commentsError } = await supabase
          .from("comments")
          .select("*")
          .eq("post_id", id)
          .order("created_at", { ascending: false });

        if (commentsError) {
          console.error("Error fetching comments:", commentsError);
        } else {
          commentsData = data || [];
        }

        console.log("Comments data:", commentsData);

        // Step 5: Fetch profiles for all comment authors
        const commentUserIds = [
          ...new Set(commentsData.map((comment) => comment.user_id)),
        ];

        let commentProfiles = [];
        if (commentUserIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("*")
            .in("id", commentUserIds);

          if (profilesError) {
            console.error("Error fetching comment profiles:", profilesError);
          } else {
            commentProfiles = profilesData || [];
          }
        }

        console.log("Comment profiles:", commentProfiles);

        // Step 6: Combine comments with their author profiles
        const enrichedComments = commentsData.map((comment) => {
          const profile = commentProfiles.find((p) => p.id === comment.user_id);
          return {
            ...comment,
            profile: profile || null,
            replies: [], // Initialize empty replies array
          };
        });

        // Step 7: Organize comments into a tree structure (top-level and replies)
        const topLevelComments = enrichedComments.filter(
          (comment) => !comment.parent_comment_id
        );
        const replies = enrichedComments.filter(
          (comment) => comment.parent_comment_id
        );

        // Add replies to their parent comments
        replies.forEach((reply) => {
          const parentComment = topLevelComments.find(
            (c) => c.id === reply.parent_comment_id
          );
          if (parentComment) {
            parentComment.replies.push(reply);
          }
        });

        // Create the complete post object with author, owner, and comments
        const completePost = {
          ...postData,
          profile: authorProfile || null,
          ownerProfile: ownerProfile || null,
          comments: topLevelComments,
        };

        setPost(completePost);
      } catch (error) {
        console.error("Error in fetchPost:", error);
      }
    };

    checkUser();
    fetchPost();

    // Subscribe to comments changes
    const commentsSubscription = supabase
      .channel("comments-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `post_id=eq.${id}`,
        },
        () => fetchPost()
      )
      .subscribe();

    return () => {
      commentsSubscription.unsubscribe();
    };
  }, [id, accountId, supabase, router, searchParams]);

  const addComment = async (e) => {
    e.preventDefault();
    if (!commentContent.trim()) return;

    setIsLoading(true);

    try {
      // Determine the owner_id (whose account the comment belongs to)
      const ownerId = accountId || user.id;

      console.log("Creating comment as user", user.id, "for owner", ownerId);

      const { error } = await supabase.from("comments").insert({
        post_id: id,
        user_id: user.id, // Who created the comment
        owner_id: ownerId, // Whose account it belongs to
        content: commentContent,
        parent_comment_id: replyTo,
      });

      if (error) {
        console.error("Error details:", error);
        throw error;
      }

      setCommentContent("");
      setReplyTo(null);
    } catch (error) {
      console.error("Error adding comment:", error);
      alert("Failed to add comment: " + (error.message || "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  if (!post) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />

      {/* Manager Mode Banner */}
      {isManagerMode && ownerProfile && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="container mx-auto px-4 py-2 flex items-center">
            <UserCog className="text-amber-600 mr-2" size={20} />
            <p className="text-amber-800">
              <span className="font-medium">Manager Mode:</span> You are
              managing comments for {ownerProfile.full_name}.
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
        <button
          onClick={() =>
            router.push(
              isManagerMode ? `/posts?accountId=${accountId}` : "/posts"
            )
          }
          className="flex items-center text-amber-600 hover:text-amber-700 mb-6"
        >
          <ArrowLeft size={16} className="mr-1" />
          Back to Posts
        </button>

        {/* Post Content */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-medium">
                {/* Show post ownership information */}
                {post.ownerProfile?.full_name ||
                  post.profile?.full_name ||
                  "Account Owner"}

                {/* If the creator is different from the owner, show that information */}
                {post.user_id !== post.owner_id && post.profile && (
                  <span className="text-sm text-gray-500 ml-2">
                    (Posted by: {post.profile.full_name})
                  </span>
                )}

                {/* Fallback if no profiles found */}
                {!post.ownerProfile &&
                  !post.profile &&
                  ` (ID: ${post.owner_id.slice(0, 8)}...)`}
              </h3>
              <p className="text-sm text-gray-500">
                {new Date(post.created_at).toLocaleString()}
              </p>
            </div>
          </div>
          <p className="mb-4">{post.content}</p>
        </div>

        {/* Add Comment Form */}
        <form
          onSubmit={addComment}
          className="mb-8 bg-white p-4 rounded-lg shadow"
        >
          <h2 className="text-xl font-semibold mb-4">
            {replyTo
              ? isManagerMode
                ? `Reply as ${ownerProfile?.full_name || "Account Owner"}`
                : "Reply to Comment"
              : isManagerMode
              ? `Comment as ${ownerProfile?.full_name || "Account Owner"}`
              : "Add a Comment"}
          </h2>
          {replyTo && (
            <div className="mb-3 p-3 bg-amber-50 rounded-md flex justify-between items-center">
              <span>Replying to a comment</span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                Cancel Reply
              </button>
            </div>
          )}
          <textarea
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
            placeholder="Add your comment..."
            className="w-full p-3 border rounded-md focus:ring-amber-500 focus:border-amber-500 min-h-[80px]"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !commentContent.trim()}
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
                {replyTo ? "Reply" : "Comment"}
                {isManagerMode && ` as ${ownerProfile?.full_name || "Owner"}`}
              </>
            )}
          </button>
        </form>

        {/* Comments List */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold mb-4">
            Comments ({post.comments.length})
          </h2>

          {post.comments.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-lg shadow">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">
                No comments yet
              </h3>
              <p className="mt-1 text-gray-500">
                Be the first to share your thoughts!
              </p>
            </div>
          ) : (
            post.comments.map((comment) => (
              <div key={comment.id} className="bg-white rounded-lg shadow p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-medium">
                      {comment.profile
                        ? comment.profile.full_name
                        : "Anonymous"}
                      {!comment.profile &&
                        ` (User ID: ${comment.user_id.slice(0, 8)}...)`}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {new Date(comment.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <p className="mb-3">{comment.content}</p>

                <button
                  onClick={() => setReplyTo(comment.id)}
                  className="text-amber-600 hover:text-amber-700 text-sm mb-4"
                >
                  Reply to this comment
                </button>

                {/* Replies to this comment */}
                {comment.replies.length > 0 && (
                  <div className="pl-6 border-l-2 border-gray-200 mt-4 space-y-4">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="bg-gray-50 rounded-md p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium">
                              {/* Show the account owner's name (not the creator's) */}
                              {ownerProfile?.full_name || "Account Owner"}
                              {/* Optional: show who created it */}
                              {post.owner_id }
                            </h4>
                            <p className="text-xs text-gray-500">
                              {new Date(reply.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <p>{reply.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
