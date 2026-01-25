package com.ndomog.inventory.presentation.activity

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.ndomog.inventory.di.ViewModelFactory
import com.ndomog.inventory.presentation.theme.NdomogColors
import java.text.SimpleDateFormat
import java.util.*

data class ActivityLog(
    val id: String,
    val userId: String?,
    val userEmail: String,
    val action: String,
    val itemName: String,
    val details: String?,
    val createdAt: Date,
    val username: String? = null,
    val avatarUrl: String? = null
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ActivityScreen(
    onBack: () -> Unit,
    viewModelFactory: ViewModelFactory
) {
    val viewModel: ActivityViewModel = viewModel(factory = viewModelFactory)
    val logs by viewModel.activityLogs.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            Icons.Filled.ShowChart,
                            contentDescription = null,
                            tint = NdomogColors.Primary
                        )
                        Text(
                            "Activity Log",
                            color = NdomogColors.TextLight,
                            style = MaterialTheme.typography.headlineSmall
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            Icons.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = NdomogColors.TextLight
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = NdomogColors.DarkCard
                )
            )
        },
        containerColor = NdomogColors.DarkBackground
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            if (isLoading) {
                LinearProgressIndicator(
                    modifier = Modifier.fillMaxWidth(),
                    color = NdomogColors.Primary,
                    trackColor = NdomogColors.DarkCard
                )
            }

            if (logs.isEmpty() && !isLoading) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            Icons.Filled.ShowChart,
                            contentDescription = null,
                            tint = NdomogColors.TextMuted.copy(alpha = 0.5f),
                            modifier = Modifier.size(64.dp)
                        )
                        Text(
                            "No activity yet",
                            color = NdomogColors.TextMuted,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(logs) { log ->
                        ActivityLogItem(log = log)
                    }
                }
            }
        }
    }
}

@Composable
fun ActivityLogItem(log: ActivityLog) {
    val dateFormat = remember { SimpleDateFormat("MMM d, h:mm a", Locale.getDefault()) }
    
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = NdomogColors.DarkCard),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.Top,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Avatar
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(NdomogColors.Primary.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                if (log.avatarUrl != null) {
                    AsyncImage(
                        model = log.avatarUrl,
                        contentDescription = log.username ?: log.userEmail,
                        modifier = Modifier.fillMaxSize()
                    )
                } else {
                    Text(
                        text = (log.username ?: log.userEmail).firstOrNull()?.uppercase() ?: "U",
                        color = NdomogColors.Primary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                }
            }
            
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = log.username ?: log.userEmail.substringBefore("@"),
                        color = NdomogColors.TextLight,
                        fontWeight = FontWeight.Medium,
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Text(" ", color = NdomogColors.TextMuted)
                    Text(
                        text = log.action,
                        color = when (log.action) {
                            "added" -> NdomogColors.Success
                            "removed" -> NdomogColors.Error
                            "updated" -> NdomogColors.Primary
                            else -> NdomogColors.TextMuted
                        },
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Text(" ", color = NdomogColors.TextMuted)
                    Text(
                        text = log.itemName,
                        color = NdomogColors.TextLight,
                        fontWeight = FontWeight.Medium,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
                
                if (log.details != null) {
                    Text(
                        text = log.details,
                        color = NdomogColors.TextMuted,
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(top = 2.dp)
                    )
                }
                
                Text(
                    text = dateFormat.format(log.createdAt),
                    color = NdomogColors.TextMuted.copy(alpha = 0.7f),
                    style = MaterialTheme.typography.labelSmall,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }
        }
    }
}
