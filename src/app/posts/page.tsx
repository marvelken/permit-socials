'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../../utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Send, MessageSquare } from 'lucide-react'
import Header from './../../components/Header'


export default function PostsPage() {
  const [content, setContent] = useState('')
  const [posts, setPosts] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Check if user is authenticated
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login-register')
        return
      }
      setUser(user)
    }

    // Fetch posts
    const fetchPosts = async () => {
      try {
        // First fetch all posts
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false })
        
        if (postsError) {
          console.error('Error fetching posts:', postsError)
          return
        }

        // For debugging - check what we're getting from posts
        console.log('Posts data:', postsData)
        
        if (!postsData || postsData.length === 0) {
          setPosts([])
          return
        }

        // Get all user IDs from the posts
        const userIds = [...new Set(postsData.map(post => post.user_id))]
        console.log('User IDs to fetch profiles for:', userIds)
        
        // Fetch profiles for all post authors
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds)
        
        if (profilesError) {
          console.error('Error fetching profiles:', profilesError)
        }

        // For debugging - check what profiles we're getting
        console.log('Profiles data:', profilesData)
        
        // Get comment counts
        const postIds = postsData.map(post => post.id)
        const { data: commentsData, error: commentsError } = await supabase
          .from('comments')
          .select('post_id')
          .in('post_id', postIds)
        
        if (commentsError) {
          console.error('Error fetching comments:', commentsError)
        }
        
        // Count comments
        const commentCounts = {}
        if (commentsData) {
          commentsData.forEach(comment => {
            commentCounts[comment.post_id] = (commentCounts[comment.post_id] || 0) + 1
          })
        }
        
        // Combine all data
        const combinePostData = postsData.map(post => {
          // Find the author's profile
          const authorProfile = profilesData?.find(profile => profile.id === post.user_id)
          
          // For debugging - log what we find for each post
          console.log(`Post ${post.id} by user ${post.user_id}, found profile:`, authorProfile)
          
          return {
            ...post,
            profile: authorProfile || null,
            commentCount: commentCounts[post.id] || 0
          }
        })
        
        setPosts(combinePostData)
      } catch (error) {
        console.error('Unexpected error in fetchPosts:', error)
      }
    }

    checkUser()
    fetchPosts()

    // Set up realtime subscriptions
    const postsSubscription = supabase
      .channel('posts-channel')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'posts' 
      }, () => fetchPosts())
      .subscribe()

    const commentsSubscription = supabase
      .channel('comments-channel')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'comments' 
      }, () => fetchPosts())
      .subscribe()

    return () => {
      postsSubscription.unsubscribe()
      commentsSubscription.unsubscribe()
    }
  }, [supabase, router])

  const createPost = async (e) => {
    e.preventDefault()
    if (!content.trim()) return
    
    setIsLoading(true)
    
    try {
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content
        })
      
      if (error) throw error
      
      setContent('')
    } catch (error) {
      console.error('Error creating post:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Posts</h1>
        
        {/* Create Post Form */}
        <form onSubmit={createPost} className="mb-8 bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Create a Post</h2>
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
              </>
            )}
          </button>
        </form>
        
        {/* Posts List */}
        <div className="space-y-6">
          {posts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">No posts yet</h3>
              <p className="mt-1 text-gray-500">Get the conversation started by creating the first post.</p>
            </div>
          ) : (
            posts.map((post) => {
              // Log what we're rendering for each post
              console.log('Rendering post:', post)
              
              return (
                <div key={post.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-medium">
                        {/* {post.profile ? post.email : 'Anonymous'}  */}
                        {!post.profile && ` User ID: ${post.user_id.slice(0, 8)}...`}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {new Date(post.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <p className="mb-4">{post.content}</p>
                  
                  <button
                    onClick={() => router.push(`/posts/${post.id}`)}
                    className="text-amber-600 hover:text-amber-700 text-sm flex items-center"
                  >
                    <MessageSquare size={16} className="mr-1" />
                    {post.commentCount} Comments - Click to view and reply
                  </button>
                </div>
              )
            })
          )}
        </div>
      </main>
    </div>
  )
}