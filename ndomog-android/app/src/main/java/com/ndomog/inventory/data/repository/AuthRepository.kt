package com.ndomog.inventory.data.repository

import com.ndomog.inventory.data.models.Profile
import com.ndomog.inventory.data.remote.SupabaseClient
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.gotrue.providers.builtin.Email
import io.github.jan.supabase.gotrue.user.UserInfo
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow

class AuthRepository {
    private val supabase = SupabaseClient.client

    suspend fun signUp(email: String, password: String): Result<Unit> {
        return try {
            supabase.auth.signUpWith(Email) {
                this.email = email
                this.password = password
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun signIn(email: String, password: String): Result<Unit> {
        return try {
            supabase.auth.signInWith(Email) {
                this.email = email
                this.password = password
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun signOut(): Result<Unit> {
        return try {
            supabase.auth.signOut()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun getCurrentUser(): UserInfo? {
        return supabase.auth.currentUserOrNull()
    }

    /**
     * Get email from current session - fallback when currentUserOrNull() doesn't have it
     */
    fun getEmailFromSession(): String? {
        return supabase.auth.currentSessionOrNull()?.user?.email
    }

    fun isLoggedIn(): Boolean {
        return supabase.auth.currentSessionOrNull() != null
    }

    fun observeAuthState(): Flow<UserInfo?> = flow {
        emit(getCurrentUser())
        // Can add Supabase auth state listeners here
    }

    suspend fun fetchProfile(userId: String): Profile? {
        return try {
            supabase.from("profiles")
                .select {
                    filter { eq("id", userId) }
                }
                .decodeList<Profile>()
                .firstOrNull()
        } catch (_: Exception) {
            null
        }
    }

    suspend fun upsertProfile(profile: Profile): Result<Unit> {
        return try {
            supabase.from("profiles").upsert(profile)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateProfileUsername(userId: String, username: String, email: String? = null): Result<Profile> {
        return try {
            supabase.from("profiles")
                .update(mapOf("username" to username)) {
                    filter { eq("id", userId) }
                }
            var updated = fetchProfile(userId)
            if (updated == null && !email.isNullOrBlank()) {
                supabase.from("profiles").upsert(Profile(id = userId, email = email, username = username))
                updated = fetchProfile(userId)
            }
            if (updated != null && updated.username == username) {
                Result.success(updated)
            } else {
                Result.failure(Exception("Username was not saved. Check database permissions."))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updatePassword(newPassword: String): Result<Unit> {
        return try {
            // For Supabase Kotlin SDK, password updates require using the reset password flow
            // instead of direct password updates on the client
            Result.failure(Exception("Password updates require using the password reset email flow"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun sendPasswordResetEmail(email: String): Result<Unit> {
        return try {
            supabase.auth.resetPasswordForEmail(email)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
