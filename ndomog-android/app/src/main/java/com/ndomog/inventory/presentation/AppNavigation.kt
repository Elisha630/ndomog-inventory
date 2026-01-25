package com.ndomog.inventory.presentation

import com.ndomog.inventory.data.local.NdomogDatabase
import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.ndomog.inventory.data.repository.AuthRepository
import com.ndomog.inventory.presentation.auth.AuthViewModel
import com.ndomog.inventory.presentation.auth.LoginScreen
import androidx.lifecycle.viewmodel.compose.viewModel
import com.ndomog.inventory.di.ViewModelFactory
import com.ndomog.inventory.presentation.categories.CategoriesScreen
import com.ndomog.inventory.presentation.dashboard.DashboardScreen
import com.ndomog.inventory.presentation.profile.ProfileScreen
import com.ndomog.inventory.presentation.activity.ActivityScreen
import com.ndomog.inventory.presentation.notifications.NotificationsScreen

object Routes {
    const val LOGIN = "login"
    const val DASHBOARD = "dashboard"
    const val PROFILE = "profile"
    const val CATEGORIES = "categories"
    const val ACTIVITY = "activity"
    const val NOTIFICATIONS = "notifications"
}

@Composable
fun AppNavigation(
    authRepository: AuthRepository,
    database: NdomogDatabase
) {
    val navController = rememberNavController()
    val authViewModel: AuthViewModel = viewModel(factory = ViewModelFactory(authRepository, database))

    NavHost(navController = navController, startDestination = Routes.LOGIN) {
        composable(Routes.LOGIN) {
            LoginScreen(authViewModel = authViewModel) {
                navController.navigate(Routes.DASHBOARD) {
                    popUpTo(Routes.LOGIN) { inclusive = true }
                }
            }
        }
        composable(Routes.DASHBOARD) {
            val viewModelFactory = ViewModelFactory(authRepository, database)
            DashboardScreen(
                onLogout = {
                    navController.navigate(Routes.LOGIN) {
                        popUpTo(Routes.DASHBOARD) { inclusive = true }
                    }
                },
                onNavigateToProfile = { navController.navigate(Routes.PROFILE) },
                onNavigateToCategories = { navController.navigate(Routes.CATEGORIES) },
                onNavigateToActivity = { navController.navigate(Routes.ACTIVITY) },
                onNavigateToNotifications = { navController.navigate(Routes.NOTIFICATIONS) },
                viewModelFactory = viewModelFactory
            )
        }
        composable(Routes.PROFILE) {
            val viewModelFactory = ViewModelFactory(authRepository, database)
            ProfileScreen(onBack = { navController.popBackStack() }, viewModelFactory = viewModelFactory)
        }
        composable(Routes.CATEGORIES) {
            val viewModelFactory = ViewModelFactory(authRepository, database)
            CategoriesScreen(onBack = { navController.popBackStack() }, viewModelFactory = viewModelFactory)
        }
        composable(Routes.ACTIVITY) {
            val viewModelFactory = ViewModelFactory(authRepository, database)
            ActivityScreen(onBack = { navController.popBackStack() }, viewModelFactory = viewModelFactory)
        }
        composable(Routes.NOTIFICATIONS) {
            val viewModelFactory = ViewModelFactory(authRepository, database)
            NotificationsScreen(onBack = { navController.popBackStack() }, viewModelFactory = viewModelFactory)
        }
    }
}
