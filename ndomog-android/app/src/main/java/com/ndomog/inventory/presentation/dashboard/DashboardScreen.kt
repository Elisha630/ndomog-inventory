package com.ndomog.inventory.presentation.dashboard

import android.annotation.SuppressLint
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.ndomog.inventory.data.models.Item
import com.ndomog.inventory.di.ViewModelFactory

// Color constants matching design
private val DarkBackground = Color(0xFF0F172A)
private val DarkCard = Color(0xFF1E293B)
private val AmberPrimary = Color(0xFFF59E0B)
private val TextLight = Color(0xFFFFFFFF)
private val TextMuted = Color(0xFF94A3B8)
private val RedError = Color(0xFFF87171)

@SuppressLint("UnusedMaterial3ScaffoldPaddingParameter")
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    onLogout: () -> Unit,
    onNavigateToProfile: () -> Unit,
    onNavigateToCategories: () -> Unit,
    viewModelFactory: ViewModelFactory
) {
    val viewModel: DashboardViewModel = viewModel(factory = viewModelFactory)
    val items by viewModel.items.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val error by viewModel.error.collectAsState()

    var showAddEditDialog by remember { mutableStateOf(false) }
    var itemToEdit by remember { mutableStateOf<Item?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { 
                    Text(
                        "Ndomog Inventory",
                        color = TextLight,
                        style = MaterialTheme.typography.headlineSmall
                    ) 
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = DarkCard,
                    scrolledContainerColor = DarkCard
                ),
                actions = {
                    IconButton(onClick = onNavigateToCategories) {
                        Icon(Icons.Filled.Category, contentDescription = "Categories", tint = AmberPrimary)
                    }
                    IconButton(onClick = onNavigateToProfile) {
                        Icon(Icons.Filled.Person, contentDescription = "Profile", tint = AmberPrimary)
                    }
                    IconButton(onClick = onLogout) {
                        Icon(Icons.Filled.ExitToApp, contentDescription = "Logout", tint = RedError)
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = {
                    itemToEdit = null
                    showAddEditDialog = true
                },
                containerColor = AmberPrimary,
                contentColor = Color(0xFF111827)
            ) {
                Icon(Icons.Filled.Add, contentDescription = "Add Item", modifier = Modifier.size(24.dp))
            }
        },
        containerColor = DarkBackground
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(DarkBackground)
                .padding(paddingValues)
        ) {
            if (isLoading) {
                LinearProgressIndicator(
                    modifier = Modifier.fillMaxWidth(),
                    color = AmberPrimary,
                    trackColor = DarkCard
                )
            } else if (error != null) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF7F1D1D)),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(
                        "Error: $error",
                        color = Color(0xFFFCA5A5),
                        modifier = Modifier.padding(12.dp),
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            } else {
                if (items.isEmpty()) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            "No items found.\nClick '+' to add one!",
                            color = TextMuted,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                } else {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(rememberScrollState())
                            .padding(16.dp)
                    ) {
                        // Stats Cards
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 24.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            StatsCard(
                                title = "Total Items",
                                value = items.size.toString(),
                                icon = Icons.Filled.ShoppingCart,
                                modifier = Modifier.weight(1f)
                            )
                            StatsCard(
                                title = "Categories",
                                value = items.distinctBy { it.category }.size.toString(),
                                icon = Icons.Filled.Category,
                                modifier = Modifier.weight(1f)
                            )
                        }

                        Text(
                            "Inventory Items",
                            style = MaterialTheme.typography.headlineSmall.copy(
                                color = TextLight,
                                fontWeight = FontWeight.Bold
                            ),
                            modifier = Modifier.padding(bottom = 12.dp)
                        )

                        LazyVerticalGrid(
                            columns = GridCells.Fixed(2),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                            modifier = Modifier.fillMaxSize()
                        ) {
                            items(items) { item ->
                                ItemCard(
                                    item = item,
                                    onEdit = {
                                        itemToEdit = item
                                        showAddEditDialog = true
                                    }
                                )
                            }
                        }
                    }
                }
            }
        }

        AddEditItemDialog(
            showDialog = showAddEditDialog,
            onDismiss = { showAddEditDialog = false },
            onConfirm = { item ->
                if (itemToEdit == null) {
                    viewModel.addItem(item, true)
                } else {
                    viewModel.updateItem(item, true)
                }
                showAddEditDialog = false
            },
            existingItem = itemToEdit
        )
    }
}

@Composable
fun StatsCard(
    title: String,
    value: String,
    icon: ImageVector,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .height(100.dp),
        colors = CardDefaults.cardColors(
            containerColor = DarkCard.copy(alpha = 0.8f)
        ),
        border = BorderStroke(1.dp, AmberPrimary.copy(alpha = 0.3f)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                imageVector = icon,
                contentDescription = title,
                tint = AmberPrimary,
                modifier = Modifier.size(20.dp)
            )
            Text(
                value,
                style = MaterialTheme.typography.headlineSmall.copy(
                    color = TextLight,
                    fontWeight = FontWeight.Bold
                ),
                fontSize = 20.sp
            )
            Text(
                title,
                style = MaterialTheme.typography.labelSmall.copy(color = TextMuted),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
fun ItemCard(item: Item, onEdit: (Item) -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onEdit(item) },
        colors = CardDefaults.cardColors(
            containerColor = DarkCard.copy(alpha = 0.8f)
        ),
        border = BorderStroke(1.dp, AmberPrimary.copy(alpha = 0.2f)),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            // Item Image Placeholder
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(120.dp)
                    .background(Color(0xFF0F172A))
                    .clip(RoundedCornerShape(topStart = 12.dp, topEnd = 12.dp)),
                contentAlignment = Alignment.Center
            ) {
                if (item.photoUrl != null) {
                    AsyncImage(
                        model = item.photoUrl,
                        contentDescription = "Item photo",
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                } else {
                    Icon(
                        Icons.Filled.Image,
                        contentDescription = "No image",
                        tint = TextMuted,
                        modifier = Modifier.size(40.dp)
                    )
                }

                // Stock Status Badge
                val isLow = item.quantity <= 0 || item.quantity <= 5
                if (isLow) {
                    Surface(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(8.dp),
                        color = if (item.quantity <= 0) RedError else AmberPrimary,
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            if (item.quantity <= 0) "Out" else "Low",
                            color = if (item.quantity <= 0) Color.White else Color(0xFF111827),
                            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                            modifier = Modifier.padding(4.dp, 2.dp)
                        )
                    }
                }
            }

            // Item Info
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp)
            ) {
                Text(
                    item.name,
                    style = MaterialTheme.typography.titleSmall.copy(
                        color = TextLight,
                        fontWeight = FontWeight.Bold
                    ),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )

                Text(
                    item.category ?: "Uncategorized",
                    style = MaterialTheme.typography.labelSmall.copy(color = TextMuted),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(top = 4.dp)
                )

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            "Qty: ${item.quantity}",
                            style = MaterialTheme.typography.bodySmall.copy(color = TextLight),
                            fontWeight = FontWeight.SemiBold
                        )
                        if (item.sellingPrice != null) {
                            Text(
                                "₦${item.sellingPrice}",
                                style = MaterialTheme.typography.labelSmall.copy(
                                    color = AmberPrimary,
                                    fontWeight = FontWeight.Bold
                                )
                            )
                        }
                    }
                    IconButton(
                        onClick = { onEdit(item) },
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(
                            Icons.Filled.Edit,
                            contentDescription = "Edit",
                            tint = AmberPrimary,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }
        }
    }
}
