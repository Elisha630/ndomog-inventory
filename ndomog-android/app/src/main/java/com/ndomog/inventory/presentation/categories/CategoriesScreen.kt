package com.ndomog.inventory.presentation.categories

import android.annotation.SuppressLint
import androidx.compose.foundation.background
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Category
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.ndomog.inventory.di.ViewModelFactory
import com.ndomog.inventory.presentation.theme.NdomogColors

@SuppressLint("UnusedMaterial3ScaffoldPaddingParameter")
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CategoriesScreen(
    onBack: () -> Unit,
    viewModelFactory: ViewModelFactory
) {
    val viewModel: CategoriesViewModel = viewModel(factory = viewModelFactory)
    val categories by viewModel.categories.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val error by viewModel.error.collectAsState()

    var showRenameDialog by remember { mutableStateOf(false) }
    var categoryToRename by remember { mutableStateOf<String?>(null) }
    var newCategoryName by remember { mutableStateOf("") }

    var showConfirmDeleteDialog by remember { mutableStateOf(false) }
    var categoryToDelete by remember { mutableStateOf<String?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { 
                    Text(
                        "Categories",
                        color = NdomogColors.TextLight,
                        style = MaterialTheme.typography.headlineSmall
                    ) 
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            Icons.Filled.ArrowBack, 
                            contentDescription = "Back", 
                            tint = NdomogColors.Primary
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = NdomogColors.DarkCard,
                    scrolledContainerColor = NdomogColors.DarkCard
                )
            )
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
                if (categories.isEmpty()) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                Icons.Filled.Category,
                                contentDescription = "No categories",
                                tint = NdomogColors.TextMuted,
                                modifier = Modifier.size(48.dp)
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                "No categories found.",
                                color = NdomogColors.TextMuted,
                                style = MaterialTheme.typography.bodyMedium
                            )
                            Text(
                                "Categories are created automatically when you add items.",
                                color = NdomogColors.TextMuted.copy(alpha = 0.7f),
                                style = MaterialTheme.typography.bodySmall,
                                modifier = Modifier.padding(top = 8.dp, start = 32.dp, end = 32.dp)
                            )
                        }
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(categories) { category ->
                            CategoryCard(
                                categoryName = category.name,
                                onRename = {
                                    categoryToRename = category.name
                                    newCategoryName = category.name
                                    showRenameDialog = true
                                },
                                onDelete = {
                                    categoryToDelete = category.name
                                    showConfirmDeleteDialog = true
                                }
                            )
                        }
                    }
                }
            }
        }

        // Rename Dialog
        if (showRenameDialog) {
            AlertDialog(
                onDismissRequest = { showRenameDialog = false },
                containerColor = NdomogColors.DarkCard,
                titleContentColor = NdomogColors.TextLight,
                textContentColor = NdomogColors.TextMuted,
                title = { 
                    Text(
                        "Rename Category",
                        fontWeight = FontWeight.Bold
                    ) 
                },
                text = {
                    OutlinedTextField(
                        value = newCategoryName,
                        onValueChange = { newCategoryName = it },
                        label = { Text("New Category Name", color = NdomogColors.TextMuted) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            unfocusedBorderColor = NdomogColors.InputBorder,
                            focusedBorderColor = NdomogColors.Primary,
                            unfocusedContainerColor = NdomogColors.InputBackground.copy(alpha = 0.5f),
                            focusedContainerColor = NdomogColors.InputBackground.copy(alpha = 0.5f),
                            unfocusedTextColor = NdomogColors.TextLight,
                            focusedTextColor = NdomogColors.TextLight,
                            cursorColor = NdomogColors.Primary
                        ),
                        shape = RoundedCornerShape(8.dp)
                    )
                },
                confirmButton = {
                    Button(
                        onClick = {
                            categoryToRename?.let { oldName ->
                                viewModel.renameCategory(oldName, newCategoryName)
                            }
                            showRenameDialog = false
                        },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = NdomogColors.Primary
                        ),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text("Save", color = NdomogColors.TextOnPrimary, fontWeight = FontWeight.Bold)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showRenameDialog = false }) {
                        Text("Cancel", color = NdomogColors.TextMuted)
                    }
                }
            )
        }

        // Delete Confirmation Dialog
        if (showConfirmDeleteDialog) {
            AlertDialog(
                onDismissRequest = { showConfirmDeleteDialog = false },
                containerColor = NdomogColors.DarkCard,
                titleContentColor = NdomogColors.TextLight,
                textContentColor = NdomogColors.TextMuted,
                title = { 
                    Text(
                        "Delete Category?",
                        fontWeight = FontWeight.Bold
                    ) 
                },
                text = { 
                    Text("Are you sure you want to delete '${categoryToDelete}'? All items in this category will also be deleted.") 
                },
                confirmButton = {
                    Button(
                        onClick = {
                            categoryToDelete?.let { viewModel.deleteCategory(it) }
                            showConfirmDeleteDialog = false
                        },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = NdomogColors.Error
                        ),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text("Delete", color = Color.White, fontWeight = FontWeight.Bold)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showConfirmDeleteDialog = false }) {
                        Text("Cancel", color = NdomogColors.TextMuted)
                    }
                }
            )
        }
    }
}

@Composable
fun CategoryCard(
    categoryName: String, 
    onRename: () -> Unit, 
    onDelete: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { /* Future: View items in category */ },
        colors = CardDefaults.cardColors(
            containerColor = NdomogColors.DarkCard.copy(alpha = 0.8f)
        ),
        border = BorderStroke(1.dp, NdomogColors.Primary.copy(alpha = 0.2f)),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Category Icon
            Surface(
                modifier = Modifier.size(40.dp),
                shape = RoundedCornerShape(8.dp),
                color = NdomogColors.Primary.copy(alpha = 0.15f)
            ) {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier.fillMaxSize()
                ) {
                    Icon(
                        Icons.Filled.Category,
                        contentDescription = "Category",
                        tint = NdomogColors.Primary,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
            
            Spacer(modifier = Modifier.width(12.dp))
            
            // Category Name
            Text(
                categoryName, 
                style = MaterialTheme.typography.titleMedium.copy(
                    color = NdomogColors.TextLight,
                    fontWeight = FontWeight.SemiBold
                ), 
                modifier = Modifier.weight(1f)
            )
            
            // Action Buttons
            IconButton(
                onClick = onRename,
                modifier = Modifier.size(36.dp)
            ) {
                Icon(
                    Icons.Filled.Edit, 
                    contentDescription = "Rename Category",
                    tint = NdomogColors.Primary,
                    modifier = Modifier.size(18.dp)
                )
            }
            IconButton(
                onClick = onDelete,
                modifier = Modifier.size(36.dp)
            ) {
                Icon(
                    Icons.Filled.Delete, 
                    contentDescription = "Delete Category",
                    tint = NdomogColors.Error,
                    modifier = Modifier.size(18.dp)
                )
            }
        }
    }
}
