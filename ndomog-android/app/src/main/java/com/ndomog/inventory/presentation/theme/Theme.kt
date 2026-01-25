package com.ndomog.inventory.presentation.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

/**
 * Ndomog brand colors (exactly matching web app CSS variables)
 * 
 * Web CSS uses HSL format:
 * --primary: 38 92% 50% = #F59E0B (Amber)
 * --background (dark): 222 47% 6% = #0A0E14
 * --card (dark): 222 47% 8% = #0F1419
 * --secondary (dark): 222 30% 14% = #1A1F26
 * --muted-foreground (dark): 215 20% 55% = #94A3B8
 * --border (dark): 222 20% 18% = #232B36
 * --foreground (dark): 210 40% 98% = #F8FAFC
 * --destructive: 0 84% 60% = #EF4444
 * --success: 142 76% 36% = #16A34A
 */

// Primary Colors (Amber)
val Primary = Color(0xFFF59E0B)           // --primary: 38 92% 50%
val PrimaryDark = Color(0xFFD97706)       // Darker amber for pressed states

// Dark Mode Colors (matching web .dark class)
val DarkBackground = Color(0xFF0A0E14)    // --background: 222 47% 6%
val DarkCard = Color(0xFF0F1419)          // --card: 222 47% 8%
val DarkSurface = Color(0xFF0F1419)       // Same as card
val DarkSecondary = Color(0xFF1A1F26)     // --secondary: 222 30% 14%
val DarkMuted = Color(0xFF1A1F26)         // --muted: 222 30% 14%
val DarkBorder = Color(0xFF232B36)        // --border: 222 20% 18%

// Text Colors (Dark Mode)
val TextPrimary = Color(0xFFF8FAFC)       // --foreground: 210 40% 98%
val TextMuted = Color(0xFF94A3B8)         // --muted-foreground: 215 20% 55%
val TextOnPrimary = Color(0xFF0A0E14)     // Dark text on amber buttons

// Light Mode Colors
val LightBackground = Color(0xFFFFFFFF)   // --background: 0 0% 100%
val LightCard = Color(0xFFFAFAFA)         // --card: 0 0% 98%
val LightSecondary = Color(0xFFF5F5F5)    // --secondary: 220 14% 96%
val LightBorder = Color(0xFFE5E7EB)       // --border: 220 13% 91%
val LightTextPrimary = Color(0xFF0F172A)  // --foreground: 222 47% 11%
val LightTextMuted = Color(0xFF64748B)    // --muted-foreground: 220 9% 46%

// Status Colors
val ErrorColor = Color(0xFFEF4444)        // --destructive: 0 84% 60%
val ErrorBackground = Color(0xFF7F1D1D)   // Dark red background for error cards
val ErrorText = Color(0xFFFCA5A5)         // Light red text
val SuccessColor = Color(0xFF16A34A)      // --success: 142 76% 36%
val WarningColor = Color(0xFFF59E0B)      // Same as primary (amber)

private val DarkColorScheme = darkColorScheme(
    primary = Primary,
    onPrimary = TextOnPrimary,
    primaryContainer = PrimaryDark,
    onPrimaryContainer = TextPrimary,
    secondary = DarkSecondary,
    onSecondary = TextPrimary,
    secondaryContainer = DarkSecondary,
    onSecondaryContainer = TextPrimary,
    tertiary = Primary,
    onTertiary = TextOnPrimary,
    background = DarkBackground,
    onBackground = TextPrimary,
    surface = DarkSurface,
    onSurface = TextPrimary,
    surfaceVariant = DarkCard,
    onSurfaceVariant = TextMuted,
    error = ErrorColor,
    onError = TextPrimary,
    errorContainer = ErrorBackground,
    onErrorContainer = ErrorText,
    outline = DarkBorder,
    outlineVariant = DarkBorder.copy(alpha = 0.5f),
    inverseSurface = LightBackground,
    inverseOnSurface = LightTextPrimary,
)

private val LightColorScheme = lightColorScheme(
    primary = Primary,
    onPrimary = LightTextPrimary,
    primaryContainer = Primary.copy(alpha = 0.1f),
    onPrimaryContainer = LightTextPrimary,
    secondary = LightSecondary,
    onSecondary = LightTextPrimary,
    secondaryContainer = LightSecondary,
    onSecondaryContainer = LightTextPrimary,
    tertiary = Primary,
    onTertiary = LightTextPrimary,
    background = LightBackground,
    onBackground = LightTextPrimary,
    surface = LightCard,
    onSurface = LightTextPrimary,
    surfaceVariant = LightCard,
    onSurfaceVariant = LightTextMuted,
    error = ErrorColor,
    onError = Color.White,
    errorContainer = ErrorColor.copy(alpha = 0.1f),
    onErrorContainer = ErrorColor,
    outline = LightBorder,
    outlineVariant = LightBorder.copy(alpha = 0.5f),
    inverseSurface = DarkBackground,
    inverseOnSurface = TextPrimary,
)

@Composable
fun NdomogTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    // Disable dynamic color to use our brand colors consistently
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            // Use dark background color for status bar in dark mode
            window.statusBarColor = if (darkTheme) DarkCard.toArgb() else Primary.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
