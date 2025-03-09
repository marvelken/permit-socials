'use server'

import { redirect } from 'next/navigation'
import { createClient } from '../../../utils/supabase/server'
import { syncUserToPermit, checkSocialMediaPermissions, verifyUserExists, type UserRole } from '../../lib/permit'

export async function login(formData: FormData) {
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { error, data: userData } = await supabase.auth.signInWithPassword(data)

    if (error) {
        console.error("Login error:", error);
        redirect('/error')
    }

    if (userData?.user) {
        console.log("Logged in user:", userData.user) // Debug the user object
        
        // Check if user has a role in Permit.io
        const hasRole = await verifyUserExists(userData.user.id)
        
        if (!hasRole) {
            redirect('/selectRole')
            
        }

        // Get permissions using the user ID from Supabase auth
        const permissions = await checkSocialMediaPermissions(userData.user.id)
        console.log('User Permissions:', permissions) // Debug permissions

        if (permissions.canView) {
            redirect('/SocialsDashboard')
        } 
        
    }

    redirect('/selectRole')
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const name = formData.get('name') as string

    // First sign up the user
    const { error, data: userData } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: name // Store the name in the user metadata
            }
        }
    })

    if (error) {
        console.error("Signup error:", error);
        redirect('/error')
    }

    // If user is created successfully, update the profiles table
    if (userData?.user) {
        // You might want to create a profile record in a separate table
        const { error: profileError } = await supabase
            .from('profiles') // Assuming you have a profiles table
            .upsert({
                id: userData.user.id,
                full_name: name,
                email: email,
                updated_at: new Date().toISOString()
            })

        if (profileError) {
            console.error("Profile creation error:", profileError);
            // Continue anyway, as the auth account was created
        }
    }

    // After filling the form, the user will be redirected to the verification page
    redirect('/verify')
}

export async function selectRole(formData: FormData) {
    const supabase = await createClient()
    const role = formData.get('role') as UserRole

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
        redirect('/login-registetr')
    }

    // Use the existing syncUserToPermit function
    const success = await syncUserToPermit(
        { id: user.id, email: user.email },
        role
    )

    if (!success) {
        console.error('Failed to sync user role')
        redirect('/error')
    }

    // Redirect based on role
    if(role){
        redirect('/SocialsDashboard')
    }
}