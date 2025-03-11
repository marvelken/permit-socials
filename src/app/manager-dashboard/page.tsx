'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare, BarChart2, Users, UserCog, AlertTriangle } from 'lucide-react';
import { createClient } from '../../../utils/supabase/client';
import Header from '@/components/Header';
import AccountSwitcher from '@/components/AccountSwitcher';

export default function ManagerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [managedAccounts, setManagedAccounts] = useState([]);
  const [currentAccount, setCurrentAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [debug, setDebug] = useState({});
  const supabase = createClient();

  useEffect(() => {
    const fetchUserAndAccounts = async () => {
      setLoading(true);
      const debugInfo = {};
      
      try {
        // 1. Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.error('Error fetching user:', userError);
          debugInfo.userError = userError;
          throw userError;
        }
        if (!user) {
          console.error('No user found');
          debugInfo.noUser = true;
          router.push('/login-register');
          return;
        }
        setUser(user);
        debugInfo.user = user;

        // 2. Get user's own profile data
        const { data: ownProfile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Error fetching own profile:', profileError);
          debugInfo.profileError = profileError;
        }
        debugInfo.ownProfile = ownProfile;

        // 3. Directly check account_access table for debugging
        const { data: allAccessRecords, error: allAccessError } = await supabase
          .from('account_access')
          .select('*');
          
        if (allAccessError) {
          console.error('Error fetching all access records:', allAccessError);
          debugInfo.allAccessError = allAccessError;
        }
        debugInfo.allAccessRecords = allAccessRecords || [];
        
        // 4. Get accounts this user manages by email (normalized to lowercase)
        const userEmail = (ownProfile?.email || user.email || '').toLowerCase();
        debugInfo.userEmail = userEmail;
        
        const { data: accessData, error: accessError } = await supabase
          .from('account_access')
          .select(`
            account_owner_id,
            manager_id,
            manager_email,
            access_level
          `)
          .ilike('manager_email', userEmail);

        if (accessError) {
          console.error('Error fetching managed accounts by email:', accessError);
          debugInfo.accessError = accessError;
        }
        debugInfo.accessData = accessData || [];

        // 5. Get accounts this user manages by ID
        const { data: accessDataById, error: accessErrorById } = await supabase
          .from('account_access')
          .select(`
            account_owner_id,
            manager_id,
            manager_email,
            access_level
          `)
          .eq('manager_id', user.id);

        if (accessErrorById) {
          console.error('Error fetching managed accounts by ID:', accessErrorById);
          debugInfo.accessErrorById = accessErrorById;
        }
        debugInfo.accessDataById = accessDataById || [];

        // 6. Combine all accounts being managed
        const combinedAccounts = [...(accessData || []), ...(accessDataById || [])];
        debugInfo.combinedAccounts = combinedAccounts;
        
        if (combinedAccounts.length === 0) {
          console.log('No managed accounts found');
          debugInfo.noManagedAccounts = true;
        }

        // 7. Get profiles for the account owners
        const ownerIds = [...new Set(combinedAccounts.map(a => a.account_owner_id))];
        debugInfo.ownerIds = ownerIds;
        
        let ownerProfiles = [];
        if (ownerIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', ownerIds);
          
          if (profilesError) {
            console.error('Error fetching owner profiles:', profilesError);
            debugInfo.profilesError = profilesError;
          }
          ownerProfiles = profiles || [];
          debugInfo.ownerProfiles = ownerProfiles;
        }

        // 8. Create the final accounts array
        const ownAccount = {
          id: user.id,
          full_name: ownProfile?.full_name || 'My Account',
          email: ownProfile?.email || user.email,
          isOwn: true
        };
        
        const managedAccountsData = combinedAccounts.map(access => {
          const ownerProfile = ownerProfiles.find(p => p.id === access.account_owner_id);
          return {
            id: access.account_owner_id,
            full_name: ownerProfile?.full_name || `Account (${access.account_owner_id.slice(0, 8)}...)`,
            email: ownerProfile?.email || access.manager_email,
            access_level: access.access_level,
            isOwn: false
          };
        });
        
        const allAccounts = [ownAccount, ...managedAccountsData];
        debugInfo.allAccounts = allAccounts;
        
        setManagedAccounts(allAccounts);
        setCurrentAccount(allAccounts[0]);
      } catch (error) {
        console.error('Error in fetchUserAndAccounts:', error);
        debugInfo.fetchError = error;
      } finally {
        setLoading(false);
        setDebug(debugInfo);
      }
    };

    fetchUserAndAccounts();
  }, [supabase, router]);

  const handleAccountSwitch = (account) => {
    setCurrentAccount(account);
    localStorage.setItem('currentAccountId', account.id);
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
      
      {/* Show warning if no managed accounts found */}
      {managedAccounts.length <= 1 && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="container mx-auto px-4 py-2 flex items-center">
            <AlertTriangle className="text-amber-600 mr-2" size={20} />
            <p className="text-amber-800">
              <span className="font-medium">No managed accounts found.</span> You haven't been added as a manager to any accounts yet.
            </p>
          </div>
        </div>
      )}
      
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
          
          {/* Other cards remain the same */}
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