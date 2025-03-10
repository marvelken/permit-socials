'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import ManagerModal from '@/components/ManagerModal';
import { MessageSquare, BarChart2, Users, UserPlus } from 'lucide-react';
import { createClient } from '../../../utils/supabase/client';

export default function SocialsDashboard() {
  const router = useRouter();
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
  const [user, setUser] = useState(null);
  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login-register');
        return;
      }
      setUser(user);
    };

    checkUser();
  }, [supabase, router]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Social Media Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Posts Card */}
          <Link href="/posts" className="block">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Posts</h2>
                <MessageSquare size={24} className="text-amber-600" />
              </div>
              <p className="text-gray-600 mb-4">Create new posts and engage with comments</p>
              <div className="mt-2 inline-flex items-center text-amber-600">
                View Posts →
              </div>
            </div>
          </Link>
          
          {/* Analytics Card (Placeholder for future) */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Analytics</h2>
              <BarChart2 size={24} className="text-gray-400" />
            </div>
            <p className="text-gray-600 mb-4">Track performance of your content (Coming soon)</p>
            <div className="mt-2 inline-flex items-center text-gray-400">
              View Analytics →
            </div>
          </div>
          
          {/* Community Card (Placeholder for future) */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Community</h2>
              <Users size={24} className="text-gray-400" />
            </div>
            <p className="text-gray-600 mb-4">Discover and connect with others (Coming soon)</p>
            <div className="mt-2 inline-flex items-center text-gray-400">
              Explore Community →
            </div>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="mt-10 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/posts">
              <button className="w-full py-3 px-4 border border-amber-600 rounded-md text-amber-600 hover:bg-amber-50 transition-colors">
                Create a New Post
              </button>
            </Link>
            <button 
              onClick={() => setIsManagerModalOpen(true)}
              className="w-full py-3 px-4 bg-amber-600 rounded-md text-white hover:bg-amber-700 transition-colors flex items-center justify-center"
            >
              <UserPlus className="mr-2" size={18} />
              Employ Content Managers
            </button>
          </div>
        </div>
        
        {/* Role-based Information */}
        <div className="mt-10 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Your Role Capabilities</h2>
          
          <div className="border-l-4 border-amber-500 pl-4 py-2 mb-4">
            <p className="text-gray-700">
              Depending on your assigned role, you have different permissions in the system:
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 rounded-md">
              <h3 className="font-medium mb-2 flex items-center">
                <MessageSquare size={18} className="mr-2 text-amber-600" />
                Content Managers
              </h3>
              <p className="text-sm text-gray-600">Can create, edit, and publish posts to engage with your audience.</p>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-md">
              <h3 className="font-medium mb-2 flex items-center">
                <MessageSquare size={18} className="mr-2 text-blue-600" />
                Engagement Specialists
              </h3>
              <p className="text-sm text-gray-600">Can reply to comments and engage with your audience without editing posts.</p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-md">
              <h3 className="font-medium mb-2 flex items-center">
                <BarChart2 size={18} className="mr-2 text-green-600" />
                Analytics Viewers
              </h3>
              <p className="text-sm text-gray-600">Can access performance data and insights without modifying content.</p>
            </div>
          </div>
        </div>
        
        {/* Getting Started Guide */}
        <div className="mt-10 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Getting Started</h2>
          
          <ol className="space-y-4 list-decimal list-inside text-gray-700">
            <li className="p-3 bg-gray-50 rounded-md">
              Create your first post by visiting the <Link href="/posts" className="text-amber-600 hover:underline">Posts page</Link>
            </li>
            <li className="p-3 bg-gray-50 rounded-md">
              Engage with comments to build your community
            </li>
            <li className="p-3 bg-gray-50 rounded-md">
              Track your content performance through analytics (coming soon)
            </li>
          </ol>
        </div>
      </main>
      
      {/* Manager Modal */}
      <ManagerModal isOpen={isManagerModalOpen} onClose={() => setIsManagerModalOpen(false)} />
      
      <footer className="bg-white border-t border-gray-200 py-6">
        <div className="container mx-auto px-4">
          <p className="text-center text-gray-500 text-sm">
            © {new Date().getFullYear()} Social Portal - Powered by Next.js, Supabase and Permit.io
          </p>
        </div>
      </footer>
    </div>
  )
}