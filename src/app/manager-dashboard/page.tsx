'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare, BarChart2, Users, UserCog } from 'lucide-react';
import { createClient } from '../../../utils/supabase/client';
import Header from '@/components/Header';
import AccountSwitcher from '../../components/AccountSwitcher';

export default function ManagerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [managedAccounts, setManagedAccounts] = useState([]);
  const [currentAccount, setCurrentAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchUserAndAccounts = async () => {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login-register');
        return;
      }
      setUser(user);

      // Fetch accounts this user manages
      const { data: accessData, error: accessError } = await supabase
        .from('account_access')
        .select(`
          account_owner_id,
          access_level,
          profiles:account_owner_id(full_name, email)
        `)
        .eq('manager_id', user.id);

      if (accessError) {
        console.error('Error fetching managed accounts:', accessError);
      }

      // Get user's own profile data
      const { data: ownProfile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching own profile:', profileError);
      }

      // Combine own account with managed accounts
      const allAccounts = [
        {
          id: user.id,
          full_name: ownProfile?.full_name || 'My Account',
          email: ownProfile?.email || user.email,
          isOwn: true
        },
        ...(accessData || []).map(access => ({
          id: access.account_owner_id,
          full_name: access.profiles?.full_name || 'Unknown',
          email: access.profiles?.email || 'Unknown',
          access_level: access.access_level,
          isOwn: false
        }))
      ];

      setManagedAccounts(allAccounts);
      
      // Default to own account
      setCurrentAccount(allAccounts[0]);
      setLoading(false);
    };

    fetchUserAndAccounts();
  }, [supabase, router]);

  const handleAccountSwitch = (account) => {
    setCurrentAccount(account);
    // In a real app, you might want to store this in global state/context
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <div className="animate-pulse text-amber-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      
      {/* Account Switcher */}
      <div className="bg-white border-b border-gray-200 py-3">
        <div className="container mx-auto px-4">
          <AccountSwitcher 
            accounts={managedAccounts}
            currentAccount={currentAccount}
            onSwitch={handleAccountSwitch}
          />
        </div>
      </div>
      
      {/* Manager Mode Banner - only show when managing someone else's account */}
      {currentAccount && !currentAccount.isOwn && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="container mx-auto px-4 py-2 flex items-center">
            <UserCog className="text-amber-600 mr-2" size={20} />
            <p className="text-amber-800">
              <span className="font-medium">Manager Mode:</span> You are managing {currentAccount.full_name}'s account.
            </p>
          </div>
        </div>
      )}
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">
          {currentAccount?.isOwn ? 'My Dashboard' : 'Management Dashboard'}
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Posts Management Card */}
          <Link href={`/posts${!currentAccount?.isOwn ? `?accountId=${currentAccount?.id}` : ''}`} className="block">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Posts</h2>
                <MessageSquare size={24} className="text-amber-600" />
              </div>
              <p className="text-gray-600 mb-4">
                {currentAccount?.isOwn 
                  ? 'Create and manage your own posts'
                  : `Create and manage posts for ${currentAccount?.full_name}`}
              </p>
              <div className="mt-2 inline-flex items-center text-amber-600">
                Manage Posts →
              </div>
            </div>
          </Link>
          
          {/* Analytics Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Analytics</h2>
              <BarChart2 size={24} className="text-gray-400" />
            </div>
            <p className="text-gray-600 mb-4">
              {currentAccount?.isOwn 
                ? 'View performance of your content'
                : `View performance for ${currentAccount?.full_name}'s content`}
              (Coming soon)
            </p>
            <div className="mt-2 inline-flex items-center text-gray-400">
              View Analytics →
            </div>
          </div>
          
          {/* Engagement Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Engagement</h2>
              <Users size={24} className="text-gray-400" />
            </div>
            <p className="text-gray-600 mb-4">
              {currentAccount?.isOwn 
                ? 'Respond to comments on your posts'
                : `Respond to comments for ${currentAccount?.full_name}`}
              (Coming soon)
            </p>
            <div className="mt-2 inline-flex items-center text-gray-400">
              Manage Engagement →
            </div>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="mt-10 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href={`/posts${!currentAccount?.isOwn ? `?accountId=${currentAccount?.id}` : ''}`}>
              <button className="w-full py-3 px-4 border border-amber-600 rounded-md text-amber-600 hover:bg-amber-50 transition-colors">
                {currentAccount?.isOwn 
                  ? 'Create New Post'
                  : `Create Post for ${currentAccount?.full_name}`}
              </button>
            </Link>
            <Link href={`/posts${!currentAccount?.isOwn ? `?accountId=${currentAccount?.id}` : ''}`}>
              <button className="w-full py-3 px-4 bg-amber-600 rounded-md text-white hover:bg-amber-700 transition-colors">
                View Recent Activity
              </button>
            </Link>
          </div>
        </div>
      </main>
      
      <footer className="bg-white border-t border-gray-200 py-6">
        <div className="container mx-auto px-4">
          <p className="text-center text-gray-500 text-sm">
            © {new Date().getFullYear()} Social Portal
          </p>
        </div>
      </footer>
    </div>
  )
}