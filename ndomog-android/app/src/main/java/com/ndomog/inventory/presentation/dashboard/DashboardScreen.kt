package com.ndomog.inventory.presentation.dashboard

import android.annotation.SuppressLint
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.ndomog.inventory.data.models.Item
import com.ndomog.inventory.di.ViewModelFactory
import com.ndomog.inventory.presentation.theme.NdomogColors

@SuppressLint("UnusedMaterial3ScaffoldPaddingParameter")
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    onLogout: () -> Unit,
    onNavigateToProfile: () -> Unit,
    onNavigateToCategories: () -> Unit,
    onNavigateToActivity: () -> Unit = {},
    onNavigateToNotifications: () -> Unit = {},
    viewModelFactory: ViewModelFactory,
    userAvatarUrl: String? = null,
    userId: String = ""
) {
    val viewModel: DashboardViewModel = viewModel(factory = viewModelFactory)
    val items by viewModel.items.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val error by viewModel.error.collectAsState()

    var showAddEditDialog by remember { mutableStateOf(false) }
    var itemToEdit by remember { mutableStateOf<Item?>(null) }
    var showDeleteDialog by remember { mutableStateOf<Item?>(null) }
    var showQuantityDialog by remember { mutableStateOf<Pair<Item, Int>?>(null) }
    var showPhotoViewer by remember { mutableStateOf<Pair<String, String>?>(null) }
    
    // Search and filter state
    var searchQuery by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf("all") }
    var showCategoryDropdown by remember { mutableStateOf(false) }
    var expandedItemId by remember { mutableStateOf<String?>(null) }
    
    // Bulk edit state
    var bulkEditMode by remember { mutableStateOf(false) }
    var selectedItems by remember { mutableStateOf(setOf<String>()) }
    var showBulkUpdateDialog by remember { mutableStateOf(false) }

    // Get unique categories from items
    val categories = remember(items) { items.mapNotNull { it.category }.distinct().sorted() }
    
    // Filter and sort items alphabetically
    val filteredItems = remember(items, searchQuery, selectedCategory) {
        items
            .filter { item ->
                val matchesSearch = searchQuery.isEmpty() || 
                    item.name.contains(searchQuery, ignoreCase = true) ||
                    (item.details?.contains(searchQuery, ignoreCase = true) == true)
                val matchesCategory = selectedCategory == "all" || item.category == selectedCategory
                matchesSearch && matchesCategory
            }
            .sortedBy { it.name.lowercase() }
    }

    // Calculate dashboard stats
    val totalItems = items.sumOf { it.quantity }
    val totalCost = items.sumOf { it.buyingPrice * it.quantity }
    val potentialProfit = items.sumOf { (it.sellingPrice - it.buyingPrice) * it.quantity }
    val lowStockCount = items.count { it.quantity <= it.lowStockThreshold }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { 
                    Text(
                        "Ndomog Inventory",
                        color = NdomogColors.TextLight,
                        style = MaterialTheme.typography.headlineSmall
                    ) 
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = NdomogColors.DarkCard,
                    scrolledContainerColor = NdomogColors.DarkCard
                ),
                actions = {
                    // Activity Icon
                    IconButton(onClick = onNavigateToActivity) {
                        Icon(
                            Icons.Filled.ShowChart,
                            contentDescription = "Activity",
                            tint = NdomogColors.TextMuted
                        )
                    }
                    // Notification Icon
                    IconButton(onClick = onNavigateToNotifications) {
                        Icon(
                            Icons.Outlined.Notifications,
                            contentDescription = "Notifications",
                            tint = NdomogColors.TextMuted
                        )
                    }
                    // Profile Avatar
                    IconButton(onClick = onNavigateToProfile) {
                        if (userAvatarUrl != null) {
                            AsyncImage(
                                model = userAvatarUrl,
                                contentDescription = "Profile",
                                modifier = Modifier
                                    .size(32.dp)
                                    .clip(CircleShape)
                                    .border(2.dp, NdomogColors.Primary, CircleShape),
                                contentScale = ContentScale.Crop
                            )
                        } else {
                            Box(
                                modifier = Modifier
                                    .size(32.dp)
                                    .clip(CircleShape)
                                    .border(2.dp, NdomogColors.Primary, CircleShape)
                                    .background(NdomogColors.DarkSecondary),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    Icons.Filled.Person,
                                    contentDescription = "Profile",
                                    tint = NdomogColors.Primary,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }
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
                containerColor = NdomogColors.Primary,
                contentColor = NdomogColors.TextOnPrimary
            ) {
                Icon(Icons.Filled.Add, contentDescription = "Add Item", modifier = Modifier.size(24.dp))
            }
        },
        containerColor = NdomogColors.DarkBackground
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(NdomogColors.DarkBackground)
                .padding(paddingValues)
        ) {
            if (isLoading) {
                LinearProgressIndicator(
                    modifier = Modifier.fillMaxWidth(),
                    color = NdomogColors.Primary,
                    trackColor = NdomogColors.DarkCard
                )
            } else if (error != null) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    colors = CardDefaults.cardColors(containerColor = NdomogColors.ErrorBackground),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(
                        "Error: $error",
                        color = NdomogColors.ErrorText,
                        modifier = Modifier.padding(12.dp),
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Stats Cards - Single row with 4 cards
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            DashboardStatCard(
                                title = "Total Items",
                                value = totalItems.toString(),
                                modifier = Modifier.weight(1f),
                                compact = true
                            )
                            DashboardStatCard(
                                title = "Total Cost",
                                value = "KES ${formatNumber(totalCost)}",
                                modifier = Modifier.weight(1f),
                                compact = true
                            )
                            DashboardStatCard(
                                title = "Potential Profit",
                                value = "KES ${formatNumber(potentialProfit)}",
                                valueColor = NdomogColors.Success,
                                modifier = Modifier.weight(1f),
                                compact = true
                            )
                            DashboardStatCard(
                                title = "Low Stock",
                                value = lowStockCount.toString(),
                                icon = Icons.Filled.Warning,
                                iconColor = NdomogColors.Warning,
                                modifier = Modifier.weight(1f),
                                compact = true
                            )
                        }
                    }
                    
                    // Search Bar
                    item {
                        SearchBar(
                            searchQuery = searchQuery,
                            onSearchChange = { searchQuery = it },
                            selectedCategory = selectedCategory,
                            categories = categories,
                            onCategorySelect = { selectedCategory = it },
                            showDropdown = showCategoryDropdown,
                            onDropdownToggle = { showCategoryDropdown = it }
                        )
                    }
                    
                    // Bulk Edit Button
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Surface(
                                onClick = {
                                    bulkEditMode = !bulkEditMode
                                    if (!bulkEditMode) selectedItems = setOf()
                                },
                                shape = RoundedCornerShape(8.dp),
                                color = if (bulkEditMode) NdomogColors.Primary else NdomogColors.DarkSecondary,
                                border = BorderStroke(1.dp, NdomogColors.DarkBorder)
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Icon(
                                        Icons.Filled.Layers,
                                        contentDescription = null,
                                        tint = if (bulkEditMode) NdomogColors.TextOnPrimary else NdomogColors.TextMuted,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Text(
                                        if (bulkEditMode) "Cancel" else "Bulk Edit",
                                        color = if (bulkEditMode) NdomogColors.TextOnPrimary else NdomogColors.TextLight,
                                        style = MaterialTheme.typography.labelMedium
                                    )
                                }
                            }
                            
                            if (bulkEditMode && selectedItems.isNotEmpty()) {
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        "${selectedItems.size} selected",
                                        color = NdomogColors.TextMuted,
                                        style = MaterialTheme.typography.labelSmall
                                    )
                                    Surface(
                                        onClick = { showBulkUpdateDialog = true },
                                        shape = RoundedCornerShape(8.dp),
                                        color = NdomogColors.Primary
                                    ) {
                                        Text(
                                            "Update Quantities",
                                            color = NdomogColors.TextOnPrimary,
                                            style = MaterialTheme.typography.labelMedium,
                                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }

                    if (filteredItems.isEmpty()) {
                        item {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 40.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Icon(
                                        Icons.Filled.Inventory2,
                                        contentDescription = "No items",
                                        tint = NdomogColors.TextMuted,
                                        modifier = Modifier.size(48.dp)
                                    )
                                    Spacer(modifier = Modifier.height(16.dp))
                                    Text(
                                        "No items found.",
                                        color = NdomogColors.TextMuted,
                                        style = MaterialTheme.typography.bodyMedium
                                    )
                                }
                            }
                        }
                    } else {
                        items(filteredItems, key = { it.id }) { item ->
                            CompactItemCard(
                                item = item,
                                isExpanded = expandedItemId == item.id,
                                isSelected = selectedItems.contains(item.id),
                                bulkEditMode = bulkEditMode,
                                onToggleExpand = {
                                    if (!bulkEditMode) {
                                        expandedItemId = if (expandedItemId == item.id) null else item.id
                                    }
                                },
                                onToggleSelect = {
                                    selectedItems = if (selectedItems.contains(item.id)) {
                                        selectedItems - item.id
                                    } else {
                                        selectedItems + item.id
                                    }
                                },
                                onImageClick = { url ->
                                    showPhotoViewer = Pair(url, item.name)
                                },
                                onQuantityChange = { change ->
                                    showQuantityDialog = Pair(item, change)
                                },
                                onEdit = {
                                    itemToEdit = item
                                    showAddEditDialog = true
                                },
                                onDelete = {
                                    showDeleteDialog = item
                                }
                            )
                        }
                    }
                }
            }
        }

        // Add/Edit Dialog
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
        
        // Delete Confirmation Dialog
        showDeleteDialog?.let { item ->
            AlertDialog(
                onDismissRequest = { showDeleteDialog = null },
                containerColor = NdomogColors.DarkCard,
                title = {
                    Text("Delete Item", color = NdomogColors.TextLight)
                },
                text = {
                    Text(
                        "Are you sure you want to delete \"${item.name}\"?",
                        color = NdomogColors.TextMuted
                    )
                },
                confirmButton = {
                    TextButton(
                        onClick = {
                            viewModel.deleteItem(item.id, userId, true)
                            showDeleteDialog = null
                        }
                    ) {
                        Text("Delete", color = NdomogColors.Error)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showDeleteDialog = null }) {
                        Text("Cancel", color = NdomogColors.TextMuted)
                    }
                }
            )
        }
        
        // Quantity Change Dialog
        showQuantityDialog?.let { (item, change) ->
            QuantityChangeDialog(
                item = item,
                isAdding = change > 0,
                onDismiss = { showQuantityDialog = null },
                onConfirm = { amount ->
                    val newQty = if (change > 0) item.quantity + amount else item.quantity - amount
                    viewModel.updateQuantity(item.id, newQty, true)
                    showQuantityDialog = null
                }
            )
        }
        
        // Photo Viewer Dialog
        showPhotoViewer?.let { (url, name) ->
            PhotoViewerDialog(
                photoUrl = url,
                itemName = name,
                onDismiss = { showPhotoViewer = null }
            )
        }
        
        // Bulk Update Dialog
        if (showBulkUpdateDialog) {
            BulkUpdateDialog(
                selectedItems = filteredItems.filter { selectedItems.contains(it.id) },
                onDismiss = { showBulkUpdateDialog = false },
                onConfirm = { updates ->
                    updates.forEach { (item, newQty) ->
                        viewModel.updateQuantity(item.id, newQty, true)
                    }
                    showBulkUpdateDialog = false
                    bulkEditMode = false
                    selectedItems = setOf()
                }
            )
        }
    }
}

// Utility function to format numbers with commas
private fun formatNumber(number: Double): String {
    return if (number == number.toLong().toDouble()) {
        String.format("%,d", number.toLong())
    } else {
        String.format("%,.0f", number)
    }
}

@Composable
fun DashboardStatCard(
    title: String,
    value: String,
    modifier: Modifier = Modifier,
    valueColor: Color = NdomogColors.TextLight,
    icon: ImageVector? = null,
    iconColor: Color = NdomogColors.Primary,
    compact: Boolean = false
) {
    Card(
        modifier = modifier.height(if (compact) 70.dp else 90.dp),
        colors = CardDefaults.cardColors(containerColor = NdomogColors.DarkCard),
        border = BorderStroke(1.dp, NdomogColors.DarkBorder),
        shape = RoundedCornerShape(8.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(if (compact) 8.dp else 16.dp),
            verticalArrangement = Arrangement.Center
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                if (icon != null) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = iconColor,
                        modifier = Modifier.size(12.dp)
                    )
                }
                Text(
                    title,
                    style = MaterialTheme.typography.labelSmall.copy(
                        color = NdomogColors.TextMuted,
                        fontSize = if (compact) 9.sp else 12.sp
                    ),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                value,
                style = MaterialTheme.typography.titleMedium.copy(
                    color = valueColor,
                    fontWeight = FontWeight.Bold,
                    fontSize = if (compact) 14.sp else 20.sp
                ),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
fun SearchBar(
    searchQuery: String,
    onSearchChange: (String) -> Unit,
    selectedCategory: String,
    categories: List<String>,
    onCategorySelect: (String) -> Unit,
    showDropdown: Boolean,
    onDropdownToggle: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // Search Input
        Surface(
            modifier = Modifier.weight(1f),
            shape = RoundedCornerShape(8.dp),
            color = NdomogColors.DarkSecondary,
            border = BorderStroke(1.dp, NdomogColors.DarkBorder)
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Filled.Search,
                    contentDescription = null,
                    tint = NdomogColors.TextMuted,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                BasicTextField(
                    value = searchQuery,
                    onValueChange = onSearchChange,
                    textStyle = TextStyle(
                        color = NdomogColors.TextLight,
                        fontSize = 14.sp
                    ),
                    cursorBrush = SolidColor(NdomogColors.Primary),
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                    decorationBox = { innerTextField ->
                        Box {
                            if (searchQuery.isEmpty()) {
                                Text(
                                    "Search items or descriptions...",
                                    color = NdomogColors.TextMuted,
                                    fontSize = 14.sp
                                )
                            }
                            innerTextField()
                        }
                    }
                )
            }
        }
        
        // Category Dropdown
        Box {
            Surface(
                onClick = { onDropdownToggle(!showDropdown) },
                shape = RoundedCornerShape(8.dp),
                color = NdomogColors.DarkSecondary,
                border = BorderStroke(1.dp, NdomogColors.DarkBorder)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        if (selectedCategory == "all") "All Categories" else selectedCategory,
                        color = NdomogColors.TextLight,
                        style = MaterialTheme.typography.bodySmall,
                        maxLines = 1
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Icon(
                        Icons.Filled.KeyboardArrowDown,
                        contentDescription = null,
                        tint = NdomogColors.TextMuted,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
            
            DropdownMenu(
                expanded = showDropdown,
                onDismissRequest = { onDropdownToggle(false) },
                modifier = Modifier.background(NdomogColors.DarkCard)
            ) {
                DropdownMenuItem(
                    text = { Text("All Categories", color = NdomogColors.TextLight) },
                    onClick = {
                        onCategorySelect("all")
                        onDropdownToggle(false)
                    }
                )
                categories.forEach { category ->
                    DropdownMenuItem(
                        text = { Text(category, color = NdomogColors.TextLight) },
                        onClick = {
                            onCategorySelect(category)
                            onDropdownToggle(false)
                        }
                    )
                }
            }
        }
    }
}

@Composable
fun CompactItemCard(
    item: Item,
    isExpanded: Boolean,
    isSelected: Boolean,
    bulkEditMode: Boolean,
    onToggleExpand: () -> Unit,
    onToggleSelect: () -> Unit,
    onImageClick: (String) -> Unit,
    onQuantityChange: (Int) -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    val isLow = item.quantity in 1..item.lowStockThreshold
    val isOut = item.quantity <= 0
    val rotation by animateFloatAsState(targetValue = if (isExpanded) 180f else 0f, label = "chevron")

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { if (bulkEditMode) onToggleSelect() else onToggleExpand() },
        colors = CardDefaults.cardColors(containerColor = NdomogColors.DarkCard),
        border = BorderStroke(
            1.dp,
            when {
                isSelected -> NdomogColors.Primary
                isOut -> NdomogColors.Error.copy(alpha = 0.5f)
                isLow -> NdomogColors.Warning.copy(alpha = 0.5f)
                else -> NdomogColors.DarkBorder
            }
        ),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            // Compact header row
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Checkbox for bulk edit
                if (bulkEditMode) {
                    Checkbox(
                        checked = isSelected,
                        onCheckedChange = { onToggleSelect() },
                        colors = CheckboxDefaults.colors(
                            checkedColor = NdomogColors.Primary,
                            uncheckedColor = NdomogColors.TextMuted
                        ),
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                }
                
                // Item image
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(NdomogColors.DarkSecondary)
                        .clickable(enabled = item.photoUrl != null) {
                            item.photoUrl?.let { onImageClick(it) }
                        },
                    contentAlignment = Alignment.Center
                ) {
                    if (item.photoUrl != null) {
                        AsyncImage(
                            model = item.photoUrl,
                            contentDescription = item.name,
                            modifier = Modifier.fillMaxSize(),
                            contentScale = ContentScale.Crop
                        )
                    } else {
                        Icon(
                            Icons.Filled.Image,
                            contentDescription = null,
                            tint = NdomogColors.TextMuted,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
                
                Spacer(modifier = Modifier.width(12.dp))
                
                // Item info
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        item.name,
                        style = MaterialTheme.typography.bodyMedium.copy(
                            color = NdomogColors.TextLight,
                            fontWeight = FontWeight.Medium
                        ),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            item.category ?: "Uncategorized",
                            style = MaterialTheme.typography.labelSmall.copy(color = NdomogColors.TextMuted)
                        )
                        Text("•", color = NdomogColors.TextMuted, fontSize = 8.sp)
                        Text(
                            "Qty: ${item.quantity}",
                            style = MaterialTheme.typography.labelSmall.copy(
                                color = when {
                                    isOut -> NdomogColors.Error
                                    isLow -> NdomogColors.Warning
                                    else -> NdomogColors.TextLight
                                },
                                fontWeight = FontWeight.SemiBold
                            )
                        )
                    }
                }
                
                // Status badge
                if (isOut || isLow) {
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = if (isOut) NdomogColors.Error else NdomogColors.Warning,
                        modifier = Modifier.padding(end = 8.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Filled.Warning,
                                contentDescription = null,
                                tint = if (isOut) Color.White else NdomogColors.TextOnPrimary,
                                modifier = Modifier.size(10.dp)
                            )
                            Spacer(modifier = Modifier.width(2.dp))
                            Text(
                                if (isOut) "Out" else "Low",
                                style = MaterialTheme.typography.labelSmall.copy(
                                    color = if (isOut) Color.White else NdomogColors.TextOnPrimary,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 10.sp
                                )
                            )
                        }
                    }
                }
                
                // Expand chevron
                if (!bulkEditMode) {
                    Icon(
                        Icons.Filled.KeyboardArrowDown,
                        contentDescription = "Expand",
                        tint = NdomogColors.TextMuted,
                        modifier = Modifier
                            .size(20.dp)
                            .rotate(rotation)
                    )
                }
            }
            
            // Expanded content
            AnimatedVisibility(
                visible = isExpanded && !bulkEditMode,
                enter = expandVertically(),
                exit = shrinkVertically()
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp)
                        .padding(bottom = 12.dp)
                ) {
                    // Details if available
                    if (!item.details.isNullOrBlank()) {
                        Text(
                            item.details,
                            style = MaterialTheme.typography.bodySmall.copy(color = NdomogColors.TextMuted),
                            modifier = Modifier.padding(bottom = 8.dp)
                        )
                    }
                    
                    // Price info
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Surface(
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(8.dp),
                            color = NdomogColors.DarkSecondary.copy(alpha = 0.5f)
                        ) {
                            Column(modifier = Modifier.padding(8.dp)) {
                                Text("Buying", style = MaterialTheme.typography.labelSmall.copy(color = NdomogColors.TextMuted))
                                Text(
                                    "KES ${item.buyingPrice.toLong()}",
                                    style = MaterialTheme.typography.bodySmall.copy(
                                        color = NdomogColors.TextLight,
                                        fontWeight = FontWeight.Medium
                                    )
                                )
                            }
                        }
                        Surface(
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(8.dp),
                            color = NdomogColors.DarkSecondary.copy(alpha = 0.5f)
                        ) {
                            Column(modifier = Modifier.padding(8.dp)) {
                                Text("Selling", style = MaterialTheme.typography.labelSmall.copy(color = NdomogColors.TextMuted))
                                Text(
                                    "KES ${item.sellingPrice.toLong()}",
                                    style = MaterialTheme.typography.bodySmall.copy(
                                        color = NdomogColors.Success,
                                        fontWeight = FontWeight.Medium
                                    )
                                )
                            }
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(12.dp))
                    
                    // Action buttons
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Quantity controls
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            IconButton(
                                onClick = { onQuantityChange(-1) },
                                enabled = item.quantity > 0,
                                modifier = Modifier
                                    .size(32.dp)
                                    .background(NdomogColors.DarkSecondary, RoundedCornerShape(6.dp))
                            ) {
                                Icon(
                                    Icons.Filled.Remove,
                                    contentDescription = "Decrease",
                                    tint = if (item.quantity > 0) NdomogColors.TextLight else NdomogColors.TextMuted,
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                            Text(
                                item.quantity.toString(),
                                style = MaterialTheme.typography.titleMedium.copy(
                                    color = when {
                                        isOut -> NdomogColors.Error
                                        isLow -> NdomogColors.Warning
                                        else -> NdomogColors.TextLight
                                    },
                                    fontWeight = FontWeight.Bold
                                ),
                                modifier = Modifier.widthIn(min = 32.dp),
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center
                            )
                            IconButton(
                                onClick = { onQuantityChange(1) },
                                modifier = Modifier
                                    .size(32.dp)
                                    .background(NdomogColors.DarkSecondary, RoundedCornerShape(6.dp))
                            ) {
                                Icon(
                                    Icons.Filled.Add,
                                    contentDescription = "Increase",
                                    tint = NdomogColors.TextLight,
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                        }
                        
                        // Edit & Delete buttons
                        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            IconButton(
                                onClick = onEdit,
                                modifier = Modifier.size(32.dp)
                            ) {
                                Icon(
                                    Icons.Filled.Edit,
                                    contentDescription = "Edit",
                                    tint = NdomogColors.TextMuted,
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                            IconButton(
                                onClick = onDelete,
                                modifier = Modifier.size(32.dp)
                            ) {
                                Icon(
                                    Icons.Filled.Delete,
                                    contentDescription = "Delete",
                                    tint = NdomogColors.TextMuted,
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun QuantityChangeDialog(
    item: Item,
    isAdding: Boolean,
    onDismiss: () -> Unit,
    onConfirm: (Int) -> Unit
) {
    var amount by remember { mutableStateOf(1) }
    val maxAmount = if (isAdding) 9999 else item.quantity

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = NdomogColors.DarkCard,
        title = {
            Text(
                if (isAdding) "Add to Stock" else "Remove from Stock",
                color = NdomogColors.TextLight
            )
        },
        text = {
            Column {
                Text(
                    "${if (isAdding) "Add" else "Remove"} units ${if (isAdding) "to" else "from"} ${item.name}",
                    color = NdomogColors.TextMuted,
                    modifier = Modifier.padding(bottom = 16.dp)
                )
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Amount: ", color = NdomogColors.TextMuted)
                    IconButton(
                        onClick = { if (amount > 1) amount-- },
                        modifier = Modifier.size(36.dp)
                    ) {
                        Icon(Icons.Filled.Remove, null, tint = NdomogColors.TextLight)
                    }
                    Text(
                        amount.toString(),
                        style = MaterialTheme.typography.titleLarge.copy(
                            color = NdomogColors.TextLight,
                            fontWeight = FontWeight.Bold
                        ),
                        modifier = Modifier.widthIn(min = 48.dp),
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
                    )
                    IconButton(
                        onClick = { if (amount < maxAmount) amount++ },
                        modifier = Modifier.size(36.dp)
                    ) {
                        Icon(Icons.Filled.Add, null, tint = NdomogColors.TextLight)
                    }
                }
                
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    "Current: ${item.quantity} → New: ${if (isAdding) item.quantity + amount else item.quantity - amount}",
                    color = NdomogColors.TextMuted,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.fillMaxWidth(),
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                )
            }
        },
        confirmButton = {
            TextButton(onClick = { onConfirm(amount) }) {
                Text("Confirm", color = NdomogColors.Primary)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel", color = NdomogColors.TextMuted)
            }
        }
    )
}

@Composable
fun PhotoViewerDialog(
    photoUrl: String,
    itemName: String,
    onDismiss: () -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(1f),
            colors = CardDefaults.cardColors(containerColor = NdomogColors.DarkCard),
            shape = RoundedCornerShape(16.dp)
        ) {
            Box(modifier = Modifier.fillMaxSize()) {
                AsyncImage(
                    model = photoUrl,
                    contentDescription = itemName,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Fit
                )
                IconButton(
                    onClick = onDismiss,
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(8.dp)
                        .background(NdomogColors.DarkBackground.copy(alpha = 0.7f), CircleShape)
                ) {
                    Icon(
                        Icons.Filled.Close,
                        contentDescription = "Close",
                        tint = NdomogColors.TextLight
                    )
                }
            }
        }
    }
}

@Composable
fun BulkUpdateDialog(
    selectedItems: List<Item>,
    onDismiss: () -> Unit,
    onConfirm: (List<Pair<Item, Int>>) -> Unit
) {
    var quantities by remember {
        mutableStateOf(selectedItems.associate { it.id to it.quantity })
    }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.7f),
            colors = CardDefaults.cardColors(containerColor = NdomogColors.DarkCard),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Header
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Filled.Inventory,
                            contentDescription = null,
                            tint = NdomogColors.Primary
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            "Bulk Update Quantities",
                            style = MaterialTheme.typography.titleMedium.copy(color = NdomogColors.TextLight)
                        )
                    }
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Filled.Close, null, tint = NdomogColors.TextMuted)
                    }
                }
                
                Text(
                    "Update quantities for ${selectedItems.size} item${if (selectedItems.size > 1) "s" else ""}",
                    style = MaterialTheme.typography.bodySmall.copy(color = NdomogColors.TextMuted),
                    modifier = Modifier.padding(horizontal = 16.dp)
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                // Items list
                LazyColumn(
                    modifier = Modifier
                        .weight(1f)
                        .padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(selectedItems) { item ->
                        val qty = quantities[item.id] ?: item.quantity
                        val diff = qty - item.quantity
                        
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = NdomogColors.DarkSecondary.copy(alpha = 0.5f)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        item.name,
                                        style = MaterialTheme.typography.bodyMedium.copy(
                                            color = NdomogColors.TextLight,
                                            fontWeight = FontWeight.Medium
                                        ),
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Text(
                                        item.category ?: "",
                                        style = MaterialTheme.typography.labelSmall.copy(color = NdomogColors.TextMuted)
                                    )
                                    if (diff != 0) {
                                        Text(
                                            "${if (diff > 0) "+" else ""}$diff from current (${item.quantity})",
                                            style = MaterialTheme.typography.labelSmall.copy(
                                                color = if (diff > 0) NdomogColors.Success else NdomogColors.Error
                                            )
                                        )
                                    }
                                }
                                
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    IconButton(
                                        onClick = {
                                            quantities = quantities.toMutableMap().apply {
                                                this[item.id] = maxOf(0, (this[item.id] ?: 0) - 1)
                                            }
                                        },
                                        modifier = Modifier.size(32.dp)
                                    ) {
                                        Icon(Icons.Filled.Remove, null, tint = NdomogColors.TextLight, modifier = Modifier.size(16.dp))
                                    }
                                    Text(
                                        qty.toString(),
                                        style = MaterialTheme.typography.titleMedium.copy(
                                            color = NdomogColors.TextLight,
                                            fontWeight = FontWeight.Bold
                                        ),
                                        modifier = Modifier.widthIn(min = 32.dp),
                                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
                                    )
                                    IconButton(
                                        onClick = {
                                            quantities = quantities.toMutableMap().apply {
                                                this[item.id] = (this[item.id] ?: 0) + 1
                                            }
                                        },
                                        modifier = Modifier.size(32.dp)
                                    ) {
                                        Icon(Icons.Filled.Add, null, tint = NdomogColors.TextLight, modifier = Modifier.size(16.dp))
                                    }
                                }
                            }
                        }
                    }
                }
                
                // Footer buttons
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextButton(onClick = onDismiss) {
                        Text("Cancel", color = NdomogColors.TextMuted)
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    val hasChanges = selectedItems.any { (quantities[it.id] ?: it.quantity) != it.quantity }
                    Button(
                        onClick = {
                            val updates = selectedItems
                                .filter { (quantities[it.id] ?: it.quantity) != it.quantity }
                                .map { it to (quantities[it.id] ?: it.quantity) }
                            onConfirm(updates)
                        },
                        enabled = hasChanges,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = NdomogColors.Primary,
                            contentColor = NdomogColors.TextOnPrimary
                        )
                    ) {
                        Text("Confirm Updates")
                    }
                }
            }
        }
    }
}
