import { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Linking,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
// The code currently only imports AsyncStorage, which is correct for using local storage in React Native.
// Whether your data storage is "working" depends on how you use AsyncStorage in your app logic below this import.
// Please ensure you are calling AsyncStorage.setItem, AsyncStorage.getItem, etc., and handling promises and errors properly.
// Importing AsyncStorage alone does not guarantee your data is being saved or retrieved successfully.
import AsyncStorage from "@react-native-async-storage/async-storage";


interface ShoppingItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  notes?: string;
  price?: number;
  dateAdded?: Date; // Add date tracking for trends
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const categories: Category[] = [
  { id: "1", name: "Fruits & Vegetables", icon: "🥕", color: "#4CAF50" },
  { id: "2", name: "Meat & Seafood", icon: "🥩", color: "#F44336" },
  { id: "3", name: "Dairy & Eggs", icon: "🥛", color: "#2196F3" },
  { id: "4", name: "Bakery", icon: "🍞", color: "#FF9800" },
  { id: "5", name: "Pantry", icon: "🥫", color: "#795548" },
  { id: "6", name: "Frozen", icon: "🧊", color: "#00BCD4" },
  { id: "7", name: "Household", icon: "🧽", color: "#9C27B0" },
  { id: "8", name: "Personal Care", icon: "🧴", color: "#E91E63" },
];

const smartSuggestions = [
  "Milk",
  "Bread",
  "Eggs",
  "Bananas",
  "Apples",
  "Chicken Breast",
  "Rice",
  "Pasta",
  "Tomatoes",
  "Onions",
  "Cheese",
  "Yogurt",
];

// Map of suggestion (lowercase) to category name
const suggestionCategoryMap: Record<string, string> = {
  // Fruits & Vegetables
  bananas: "Fruits & Vegetables",
  apples: "Fruits & Vegetables",
  tomatoes: "Fruits & Vegetables",
  onions: "Fruits & Vegetables",
  // Dairy & Eggs
  milk: "Dairy & Eggs",
  cheese: "Dairy & Eggs",
  yogurt: "Dairy & Eggs",
  eggs: "Dairy & Eggs",
  // Meat & Seafood
  "chicken breast": "Meat & Seafood",
  // Bakery
  bread: "Bakery",
  // Pantry
  rice: "Pantry",
  pasta: "Pantry",
};

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export default function SmartShoppingListApp() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("pcs");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [notes, setNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCompleted, setShowCompleted] = useState(true);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  // Modal state for deleting single item
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  // Settings modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Edit item state
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);

  // Budget system states
  const [dailyBudget, setDailyBudget] = useState<number>(0);
  const [itemPrice, setItemPrice] = useState("");
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");

  // Reports modal state
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<
    "daily" | "weekly" | "monthly"
  >("weekly");

  // Calculate total spent
  const totalSpent = items.reduce((sum, item) => sum + (item.price || 0), 0);
  const remainingBudget = dailyBudget - totalSpent;
  const isOverBudget = totalSpent > dailyBudget && dailyBudget > 0;

  // Initialize data loading
  useEffect(() => {
    loadDataFromStorage();
  }, []);

  // Auto-fill form when editing an item
  useEffect(() => {
    if (editingItem) {
      setNewItemName(editingItem.name);
      setQuantity(editingItem.quantity.toString());
      setUnit(editingItem.unit);
      setPriority(editingItem.priority);
      setNotes(editingItem.notes || "");
      setItemPrice(editingItem.price?.toString() || "");

      // Set the category
      const category = categories.find((c) => c.name === editingItem.category);
      if (category) {
        setSelectedCategory(category);
      }

      setShowAddModal(true);
    }
  }, [editingItem]);

  // Load data from AsyncStorage
  const loadDataFromStorage = async () => {
    try {
      const [storedItems, storedBudget] = await Promise.all([
        AsyncStorage.getItem("shoppingItems"),
        AsyncStorage.getItem("dailyBudget"),
      ]);

      if (storedItems) {
        try {
          const parsedItems = JSON.parse(storedItems);
          // Convert dateAdded strings back to Date objects
          const itemsWithDates = parsedItems.map((item: any) => ({
            ...item,
            dateAdded: item.dateAdded ? new Date(item.dateAdded) : new Date(),
          }));
          setItems(itemsWithDates);
        } catch (parseError) {
          console.log("Error parsing stored items:", parseError);
          setItems([]);
        }
      }

      if (storedBudget) {
        const budget = parseFloat(storedBudget);
        if (!isNaN(budget)) {
          setDailyBudget(budget);
        }
      }
    } catch (error) {
      console.log("Error loading data from storage:", error);
      // Set default values on error
      setItems([]);
      setDailyBudget(0);
    }
  };

  // Save data to AsyncStorage
  const saveDataToStorage = async (
    itemsToSave: ShoppingItem[],
    budgetToSave: number,
  ) => {
    try {
      await Promise.all([
        AsyncStorage.setItem("shoppingItems", JSON.stringify(itemsToSave)),
        AsyncStorage.setItem("dailyBudget", budgetToSave.toString()),
      ]);
    } catch (error) {
      console.log("Error saving data to storage:", error);
      // Could show user notification here
    }
  };

  // Auto-save data whenever items or budget changes
  useEffect(() => {
    saveDataToStorage(items, dailyBudget);
  }, [items, dailyBudget]);

  const addItem = () => {
    if (!newItemName.trim()) {
      Alert.alert("Error", "Please enter an item name");
      return;
    }

    const price = parseFloat(itemPrice) || 0;
    const newTotal = totalSpent + price;

    // Budget alert when adding item
    if (dailyBudget > 0 && newTotal > dailyBudget) {
      Alert.alert(
        "Budget Alert! 🚨",
        `Adding this item will exceed your daily budget by $${(newTotal - dailyBudget).toFixed(2)}. Do you want to continue?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Add Anyway", onPress: () => proceedWithAddItem(price) },
        ],
      );
      return;
    }

    proceedWithAddItem(price);
  };

  const proceedWithAddItem = (price: number) => {
    const newItem: ShoppingItem = {
      id: Date.now().toString(),
      name: newItemName.trim(),
      category: selectedCategory.name,
      quantity: parseInt(quantity) || 1,
      unit,
      completed: false,
      priority,
      notes: notes.trim(),
      price,
      dateAdded: new Date(), // Add current date
    };

    setItems([...items, newItem]);
    resetForm();
    setShowAddModal(false);
  };

  const resetForm = () => {
    setNewItemName("");
    setQuantity("1");
    setUnit("pcs");
    setPriority("medium");
    setNotes("");
    setItemPrice("");
  };

  const toggleItem = (id: string) => {
    // If items are selected, don't toggle completion
    if (selectedItems.length > 0) return;

    setItems(
      items.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item,
      ),
    );
  };

  const toggleItemSelection = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id)
        ? prev.filter((itemId) => itemId !== id)
        : [...prev, id],
    );
  };

  const deleteSelectedItems = () => {
    if (selectedItems.length === 0) return;
    setItems((prevItems) =>
      prevItems.filter((item) => !selectedItems.includes(item.id)),
    );
    setSelectedItems([]);
  };

  const cancelSelection = () => {
    setSelectedItems([]);
  };

  // Custom delete confirmation
  const deleteItem = (id: string) => {
    setItemToDelete(id);
  };

  const confirmDeleteItem = () => {
    if (itemToDelete !== null) {
      setItems(items.filter((item) => item.id !== itemToDelete));
      setItemToDelete(null);
    }
  };

  const cancelDeleteItem = () => {
    setItemToDelete(null);
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCompleted = showCompleted || !item.completed;
    return matchesSearch && matchesCompleted;
  });

  const groupedItems = categories
    .map((category) => ({
      category,
      items: filteredItems.filter((item) => item.category === category.name),
    }))
    .filter((group) => group.items.length > 0);

  const completedCount = items.filter((item) => item.completed).length;
  const totalCount = items.length;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "#F44336";
      case "medium":
        return "#FF9800";
      case "low":
        return "#4CAF50";
      default:
        return "#9E9E9E";
    }
  };

  // Enhanced Quick Add: Set category automatically according to suggestion
  const addSuggestion = (suggestion: string) => {
    setNewItemName(suggestion);

    // Determine the category for this suggestion
    const catName = suggestionCategoryMap[suggestion.trim().toLowerCase()];
    if (catName) {
      const catObj = categories.find((c) => c.name === catName);
      if (catObj) setSelectedCategory(catObj);
    } else {
      // If not found, fallback to first category
      setSelectedCategory(categories[0]);
    }
    setShowAddModal(true);
  };

  const setBudget = () => {
    const budget = parseFloat(budgetInput);
    if (isNaN(budget) || budget < 0) {
      Alert.alert("Error", "Please enter a valid budget amount");
      return;
    }
    setDailyBudget(budget);
    setBudgetInput("");
    setShowBudgetModal(false);
  };

  // Chart data processing functions
  const getChartData = () => {
    const now = new Date();
    const chartData: { label: string; value: number; budget?: number }[] = [];

    if (selectedTimeframe === "daily") {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dayItems = items.filter((item) => {
          if (!item.dateAdded) return false;
          const itemDate = new Date(item.dateAdded);
          return itemDate.toDateString() === date.toDateString();
        });
        const daySpending = dayItems.reduce(
          (sum, item) => sum + (item.price || 0),
          0,
        );
        chartData.push({
          label: date.toLocaleDateString("en-US", { weekday: "short" }),
          value: daySpending,
          budget: dailyBudget,
        });
      }
    } else if (selectedTimeframe === "weekly") {
      // Last 4 weeks
      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + 7 * i));
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const weekItems = items.filter((item) => {
          if (!item.dateAdded) return false;
          const itemDate = new Date(item.dateAdded);
          return itemDate >= weekStart && itemDate <= weekEnd;
        });
        const weekSpending = weekItems.reduce(
          (sum, item) => sum + (item.price || 0),
          0,
        );
        chartData.push({
          label: `Week ${4 - i}`,
          value: weekSpending,
          budget: dailyBudget * 7,
        });
      }
    } else {
      // Monthly - show last 4 weeks of current month
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
      const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

      // Calculate weeks in current month
      const weeksInMonth = Math.ceil(
        (lastDayOfMonth.getDate() + firstDayOfMonth.getDay()) / 7,
      );

      for (let week = 0; week < Math.min(weeksInMonth, 4); week++) {
        const weekStart = new Date(firstDayOfMonth);
        weekStart.setDate(1 + week * 7 - firstDayOfMonth.getDay());
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        // Only include weeks that overlap with current month
        if (weekStart <= lastDayOfMonth && weekEnd >= firstDayOfMonth) {
          const weekItems = items.filter((item) => {
            if (!item.dateAdded) return false;
            const itemDate = new Date(item.dateAdded);
            return (
              itemDate >= weekStart &&
              itemDate <= weekEnd &&
              itemDate.getMonth() === currentMonth
            );
          });
          const weekSpending = weekItems.reduce(
            (sum, item) => sum + (item.price || 0),
            0,
          );
          chartData.push({
            label: `Week ${week + 1}`,
            value: weekSpending,
            budget: dailyBudget * 7,
          });
        }
      }
    }

    return chartData;
  };

  const getMaxValue = (data: { value: number; budget?: number }[]) => {
    if (data.length === 0) return 100;
    const maxSpending = Math.max(...data.map((d) => d.value), 0);
    const maxBudget = Math.max(...data.map((d) => d.budget || 0), 0);
    const maxValue = Math.max(maxSpending, maxBudget);
    return maxValue > 0 ? maxValue * 1.2 : 100; // Add 20% padding or minimum 100
  };

  const getCategoryBreakdown = () => {
    const categoryTotals: Record<string, number> = {};
    items.forEach((item) => {
      if (item.price && item.price > 0) {
        categoryTotals[item.category] =
          (categoryTotals[item.category] || 0) + item.price;
      }
    });

    return Object.entries(categoryTotals)
      .map(([category, total]) => ({
        category,
        total,
        percentage: totalSpent > 0 ? (total / totalSpent) * 100 : 0,
        color: categories.find((c) => c.name === category)?.color || "#999",
      }))
      .sort((a, b) => b.total - a.total);
  };

  const renderChart = () => {
    const data = getChartData();
    const maxValue = getMaxValue(data);
    const chartHeight = 200;
    const chartWidth = screenWidth - 80;
    const barWidth = (chartWidth - 40) / data.length - 10;

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartArea}>
          {/* Y-axis labels */}
          <View style={styles.yAxisLabels}>
            <Text style={styles.axisLabel}>${maxValue.toFixed(0)}</Text>
            <Text style={styles.axisLabel}>
              ${(maxValue * 0.75).toFixed(0)}
            </Text>
            <Text style={styles.axisLabel}>${(maxValue * 0.5).toFixed(0)}</Text>
            <Text style={styles.axisLabel}>
              ${(maxValue * 0.25).toFixed(0)}
            </Text>
            <Text style={styles.axisLabel}>$0</Text>
          </View>

          {/* Chart bars */}
          <View style={styles.chartBars}>
            {data.map((item, index) => {
              const barHeight =
                maxValue > 0 ? (item.value / maxValue) * chartHeight : 0;
              const budgetHeight =
                maxValue > 0 && item.budget
                  ? (item.budget / maxValue) * chartHeight
                  : 0;
              const isOverBudget = item.budget && item.value > item.budget;

              return (
                <View key={index} style={styles.barContainer}>
                  <View style={[styles.chartBarArea, { height: chartHeight }]}>
                    {/* Budget line */}
                    {item.budget && item.budget > 0 && (
                      <View
                        style={[
                          styles.budgetLine,
                          { bottom: budgetHeight, width: barWidth + 4 },
                        ]}
                      />
                    )}
                    {/* Spending bar */}
                    <View
                      style={[
                        styles.chartBar,
                        {
                          height: barHeight,
                          width: barWidth,
                          backgroundColor: isOverBudget ? "#F44336" : "#4CAF50",
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.xAxisLabel}>{item.label}</Text>
                  <Text style={styles.barValue}>${item.value.toFixed(0)}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    );
  };

  const renderCategoryBreakdown = () => {
    const breakdown = getCategoryBreakdown();

    return (
      <View style={styles.categoryBreakdownContainer}>
        <Text style={styles.sectionTitle}>Spending by Category</Text>
        {breakdown.map((item, index) => (
          <View key={index} style={styles.categoryBreakdownItem}>
            <View style={styles.categoryBreakdownLeft}>
              <View
                style={[
                  styles.categoryColorDot,
                  { backgroundColor: item.color },
                ]}
              />
              <Text style={styles.categoryBreakdownName}>{item.category}</Text>
            </View>
            <View style={styles.categoryBreakdownRight}>
              <Text style={styles.categoryBreakdownAmount}>
                ${item.total.toFixed(2)}
              </Text>
              <Text style={styles.categoryBreakdownPercentage}>
                ({item.percentage.toFixed(1)}%)
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  // Render the UI without the iPhone frame, notch, or home indicator

  return (
    <View style={styles.appRoot}>
      <StatusBar barStyle="light-content" backgroundColor="#1976D2" />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🛒 Krigzlist</Text>
        <Text style={styles.headerSubtitle}>
          {completedCount}/{totalCount} items completed
        </Text>
      </View>

      {/* Budget Display */}
      {dailyBudget > 0 && (
        <View
          style={[
            styles.budgetContainer,
            isOverBudget && styles.budgetContainerOverBudget,
          ]}
        >
          <View style={styles.budgetRow}>
            <Text style={styles.budgetLabel}>Budget:</Text>
            <Text style={styles.budgetAmount}>${dailyBudget.toFixed(2)}</Text>
          </View>
          <View style={styles.budgetRow}>
            <Text style={styles.budgetLabel}>Spent:</Text>
            <Text
              style={[
                styles.budgetAmount,
                isOverBudget && styles.budgetAmountOver,
              ]}
            >
              ${totalSpent.toFixed(2)}
            </Text>
          </View>
          <View style={styles.budgetRow}>
            <Text style={styles.budgetLabel}>
              {isOverBudget ? "Over by:" : "Remaining:"}
            </Text>
            <Text
              style={[
                styles.budgetAmount,
                isOverBudget
                  ? styles.budgetAmountOver
                  : styles.budgetAmountRemaining,
              ]}
            >
              ${Math.abs(remainingBudget).toFixed(2)}
            </Text>
          </View>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search items..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        {selectedItems.length > 0 ? (
          <View style={styles.selectionActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={cancelSelection}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={deleteSelectedItems}
            >
              <Text style={styles.deleteButtonText}>
                Delete ({selectedItems.length})
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddModal(true)}
            >
              <Text style={styles.addButtonText}>+ Add Item</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.reportsButton}
              onPress={() => setShowReportsModal(true)}
            >
              <Text style={styles.reportsButtonText}>📊 Reports</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.budgetButton}
              onPress={() => setShowBudgetModal(true)}
            >
              <Text style={styles.budgetButtonText}>💰 Budget</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Smart Suggestions */}
      {searchQuery === "" && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>Quick Add</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {smartSuggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionChip}
                onPress={() => addSuggestion(suggestion)}
              >
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Shopping List */}
      <ScrollView
        style={styles.listContainer}
        showsVerticalScrollIndicator={false}
      >
        {groupedItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📝</Text>
            <Text style={styles.emptyStateTitle}>Your list is empty</Text>
            <Text style={styles.emptyStateSubtitle}>
              Add some items to get started!
            </Text>
          </View>
        ) : (
          groupedItems.map(({ category, items: categoryItems }) => (
            <View key={category.id} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryIcon}>{category.icon}</Text>
                <Text style={styles.categoryName}>{category.name}</Text>
                <Text style={styles.categoryCount}>
                  ({categoryItems.length})
                </Text>
              </View>
              {categoryItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.itemContainer,
                    item.completed && styles.itemCompleted,
                    selectedItems.includes(item.id) && styles.itemSelected,
                  ]}
                  onPress={() => toggleItem(item.id)}
                  onLongPress={() => toggleItemSelection(item.id)}
                >
                  <View style={styles.itemLeft}>
                    <View
                      style={[
                        styles.checkbox,
                        item.completed && styles.checkboxCompleted,
                        selectedItems.includes(item.id) &&
                          styles.checkboxSelected,
                      ]}
                    >
                      {selectedItems.includes(item.id) ? (
                        <Text style={styles.selectionMark}>✓</Text>
                      ) : item.completed ? (
                        <Text style={styles.checkmark}>✓</Text>
                      ) : null}
                    </View>
                    <View style={styles.itemDetails}>
                      <Text
                        style={[
                          styles.itemName,
                          item.completed && styles.itemNameCompleted,
                          selectedItems.includes(item.id) &&
                            styles.itemNameSelected,
                        ]}
                      >
                        {item.name}
                      </Text>
                      <View style={styles.itemSubDetails}>
                        <Text
                          style={[
                            styles.itemQuantity,
                            selectedItems.includes(item.id) &&
                              styles.itemQuantitySelected,
                          ]}
                        >
                          {item.quantity} {item.unit}
                        </Text>
                        {item.price !== undefined && item.price > 0 && (
                          <Text
                            style={[
                              styles.itemPrice,
                              selectedItems.includes(item.id) &&
                                styles.itemPriceSelected,
                            ]}
                          >
                            ${item.price.toFixed(2)}
                          </Text>
                        )}
                      </View>
                      {item.notes && (
                        <Text
                          style={[
                            styles.itemNotes,
                            selectedItems.includes(item.id) &&
                              styles.itemNotesSelected,
                          ]}
                        >
                          {item.notes}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <TouchableOpacity
                      onPress={() => {
                        setEditingItem(item);
                      }}
                      style={{
                        marginRight: 8,
                        padding: 2,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 18,
                          color: "#1976D2",
                          fontWeight: "bold",
                        }}
                      >
                        ✏️
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => deleteItem(item.id)}
                      style={{
                        marginRight: 8,
                        padding: 2,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 18,
                          color: "#F44336",
                          fontWeight: "bold",
                        }}
                      >
                        🗑️
                      </Text>
                    </TouchableOpacity>
                    <View
                      style={[
                        styles.priorityIndicator,
                        {
                          backgroundColor: selectedItems.includes(item.id)
                            ? "#F44336"
                            : getPriorityColor(item.priority),
                        },
                      ]}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      {/* Total at bottom */}
      {items.length > 0 && (
        <View
          style={[
            styles.totalContainer,
            isOverBudget && styles.totalContainerOverBudget,
          ]}
        >
          <Text style={styles.totalLabel}>Total: </Text>
          <Text
            style={[styles.totalAmount, isOverBudget && styles.totalAmountOver]}
          >
            ${totalSpent.toFixed(2)}
          </Text>
          {dailyBudget > 0 && isOverBudget && (
            <Text style={styles.overBudgetWarning}> ⚠️ Over Budget!</Text>
          )}
        </View>
      )}

      {/* Floating Completed Toggle Button */}
      <TouchableOpacity
        style={styles.completedToggleButton}
        onPress={() => setShowCompleted(!showCompleted)}
      >
        <Text style={styles.completedToggleButtonText}>
          {showCompleted ? "👁️" : "🙈"}
        </Text>
      </TouchableOpacity>

      {/* Floating Settings Button */}
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => setShowSettingsModal(true)}
      >
        <Text style={styles.settingsButtonText}>⚙️</Text>
      </TouchableOpacity>

      {/* Reports Modal */}
      <Modal
        visible={showReportsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        transparent={true}
      >
        <View style={styles.appRootModal}>
          <View style={styles.modalContainerWide}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowReportsModal(false)}>
                <Text style={styles.modalCancel}>Close</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Spending Reports</Text>
              <View style={{ width: 50 }} />
            </View>
            <ScrollView style={styles.modalContent}>
              {/* Summary Stats */}
              <View style={styles.summaryStatsContainer}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>${totalSpent.toFixed(2)}</Text>
                  <Text style={styles.statLabel}>Total Spent</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{items.length}</Text>
                  <Text style={styles.statLabel}>Total Items</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>
                    ${(totalSpent / Math.max(items.length, 1)).toFixed(2)}
                  </Text>
                  <Text style={styles.statLabel}>Avg per Item</Text>
                </View>
              </View>

              {/* Timeframe Selection */}
              <View style={styles.timeframeContainer}>
                <Text style={styles.sectionTitle}>Spending Trends</Text>
                <View style={styles.timeframeButtons}>
                  {(["daily", "weekly", "monthly"] as const).map(
                    (timeframe) => (
                      <TouchableOpacity
                        key={timeframe}
                        style={[
                          styles.timeframeButton,
                          selectedTimeframe === timeframe &&
                            styles.timeframeButtonSelected,
                        ]}
                        onPress={() => setSelectedTimeframe(timeframe)}
                      >
                        <Text
                          style={[
                            styles.timeframeButtonText,
                            selectedTimeframe === timeframe &&
                              styles.timeframeButtonTextSelected,
                          ]}
                        >
                          {timeframe.charAt(0).toUpperCase() +
                            timeframe.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ),
                  )}
                </View>
              </View>

              {/* Chart */}
              {items.length > 0 ? (
                renderChart()
              ) : (
                <View style={styles.noDataContainer}>
                  <Text style={styles.noDataIcon}>📊</Text>
                  <Text style={styles.noDataTitle}>No Data Available</Text>
                  <Text style={styles.noDataSubtitle}>
                    Add some items with prices to see spending trends
                  </Text>
                </View>
              )}

              {/* Budget Progress */}
              {dailyBudget > 0 && (
                <View style={styles.budgetProgressContainer}>
                  <Text style={styles.sectionTitle}>Budget Progress</Text>
                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressBarBackground}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${Math.min((totalSpent / dailyBudget) * 100, 100)}%`,
                            backgroundColor: isOverBudget
                              ? "#F44336"
                              : "#4CAF50",
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {((totalSpent / dailyBudget) * 100).toFixed(1)}% of daily
                      budget used
                    </Text>
                  </View>
                </View>
              )}

              {/* Category Breakdown */}
              {items.length > 0 && renderCategoryBreakdown()}

              {/* Insights */}
              <View style={styles.insightsContainer}>
                <Text style={styles.sectionTitle}>Insights</Text>
                <View style={styles.insightItem}>
                  <Text style={styles.insightIcon}>💡</Text>
                  <Text style={styles.insightText}>
                    {completedCount > 0
                      ? `You've completed ${completedCount} out of ${totalCount} items (${((completedCount / totalCount) * 100).toFixed(1)}%)`
                      : "Start checking off completed items to track your progress!"}
                  </Text>
                </View>
                {isOverBudget && (
                  <View style={styles.insightItem}>
                    <Text style={styles.insightIcon}>⚠️</Text>
                    <Text style={styles.insightText}>
                      You&apos;re ${(totalSpent - dailyBudget).toFixed(2)} over your
                      daily budget. Consider reviewing your spending.
                    </Text>
                  </View>
                )}
                {getCategoryBreakdown().length > 0 && (
                  <View style={styles.insightItem}>
                    <Text style={styles.insightIcon}>🏆</Text>
                    <Text style={styles.insightText}>
                      Your highest spending category is{" "}
                      {getCategoryBreakdown()[0].category} at $
                      {getCategoryBreakdown()[0].total.toFixed(2)}.
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Budget Modal */}
      <Modal
        visible={showBudgetModal}
        animationType="slide"
        presentationStyle="pageSheet"
        transparent={true}
      >
        <View style={styles.appRootModal}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowBudgetModal(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Set Daily Budget</Text>
              <TouchableOpacity onPress={setBudget}>
                <Text style={styles.modalSave}>Save</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Daily Budget Amount</Text>
                <TextInput
                  style={styles.textInput}
                  value={budgetInput}
                  onChangeText={setBudgetInput}
                  placeholder="Enter your daily budget"
                  keyboardType="numeric"
                  autoFocus
                />
              </View>
              {dailyBudget > 0 && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Current Budget</Text>
                  <View style={styles.currentBudgetDisplay}>
                    <Text style={styles.currentBudgetText}>
                      ${dailyBudget.toFixed(2)}
                    </Text>
                  </View>
                </View>
              )}
              {dailyBudget > 0 && (
                <View style={styles.inputGroup}>
                  <TouchableOpacity
                    style={styles.removeBudgetButton}
                    onPress={() => {
                      setDailyBudget(0);
                      setBudgetInput("");
                      setShowBudgetModal(false);
                    }}
                  >
                    <Text style={styles.removeBudgetButtonText}>
                      Remove Budget
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Item Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        transparent={true}
      >
        <View style={styles.appRootModal}>
          <View style={styles.modalContainerWide}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingItem ? "Edit Item" : "Add New Item"}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  if (editingItem) {
                    // If editing, update the item
                    if (!newItemName.trim()) {
                      Alert.alert("Error", "Please enter an item name");
                      return;
                    }

                    const price = parseFloat(itemPrice) || 0;
                    const updatedItem = {
                      ...editingItem,
                      name: newItemName.trim(),
                      category: selectedCategory.name,
                      quantity: parseInt(quantity) || 1,
                      unit,
                      priority,
                      notes: notes.trim(),
                      price,
                    };

                    setItems(
                      items.map((item) =>
                        item.id === editingItem.id ? updatedItem : item,
                      ),
                    );
                    setEditingItem(null);
                    resetForm();
                    setShowAddModal(false);
                  } else {
                    // If adding, proceed with addItem
                    addItem();
                  }
                }}
              >
                <Text style={styles.modalSave}>
                  {editingItem ? "Save Changes" : "Add Item"}
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Item Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={newItemName}
                  onChangeText={setNewItemName}
                  placeholder="Enter item name"
                  autoFocus
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Category</Text>
                <TouchableOpacity
                  style={styles.categorySelector}
                  onPress={() => setShowCategoryModal(true)}
                >
                  <Text style={styles.categorySelectorIcon}>
                    {selectedCategory.icon}
                  </Text>
                  <Text style={styles.categorySelectorText}>
                    {selectedCategory.name}
                  </Text>
                  <Text style={styles.categorySelectorArrow}>›</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                  <Text style={styles.inputLabel}>Quantity</Text>
                  <TextInput
                    style={styles.textInput}
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="numeric"
                    placeholder="1"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                  <Text style={styles.inputLabel}>Unit</Text>
                  <TextInput
                    style={styles.textInput}
                    value={unit}
                    onChangeText={setUnit}
                    placeholder="pcs"
                  />
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Price (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  value={itemPrice}
                  onChangeText={setItemPrice}
                  keyboardType="numeric"
                  placeholder="0.00"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Priority</Text>
                <View style={styles.priorityContainer}>
                  {(["low", "medium", "high"] as const).map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.priorityButton,
                        priority === p && styles.priorityButtonSelected,
                        { borderColor: getPriorityColor(p) },
                      ]}
                      onPress={() => setPriority(p)}
                    >
                      <Text
                        style={[
                          styles.priorityButtonText,
                          priority === p && { color: getPriorityColor(p) },
                        ]}
                      >
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Notes (Optional)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add any notes..."
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Category Selection Modal */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        presentationStyle="pageSheet"
        transparent={true}
      >
        <View style={styles.appRootModal}>
          <View style={styles.modalContainerWide}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Select Category</Text>
              <View style={{ width: 50 }} />
            </View>
            <ScrollView style={styles.modalContent}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryOption,
                    selectedCategory.id === category.id &&
                      styles.categoryOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedCategory(category);
                    setShowCategoryModal(false);
                  }}
                >
                  <Text style={styles.categoryOptionIcon}>{category.icon}</Text>
                  <Text style={styles.categoryOptionText}>{category.name}</Text>
                  {selectedCategory.id === category.id && (
                    <Text style={styles.categoryOptionCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal
        visible={showSettingsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        transparent={true}
      >
        <View style={styles.appRootModal}>
          <View style={styles.modalContainerWide}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
                <Text style={styles.modalCancel}>Close</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Settings</Text>
              <View style={{ width: 50 }} />
            </View>
            <ScrollView style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>App Information</Text>
                <View style={styles.settingsItem}>
                  <Text style={styles.settingsItemText}>Version: 1.0.0</Text>
                </View>
                <View style={styles.settingsItem}>
                  <Text style={styles.settingsItemText}>
                    Total Items: {totalCount}
                  </Text>
                </View>
                <View style={styles.settingsItem}>
                  <Text style={styles.settingsItemText}>
                    Completed Items: {completedCount}
                  </Text>
                </View>
                <View style={styles.settingsItem}>
                  <Text style={styles.settingsItemText}>
                    Total Spent: ${totalSpent.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.settingsItem}>
                  <Text style={styles.settingsItemText}>
                    Daily Budget: ${dailyBudget.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.settingsItem}>
                  <Text style={styles.settingsItemText}>
                    Made by Kristian✌️
                  </Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Quick Actions</Text>
                <TouchableOpacity
                  style={styles.settingsButton2}
                  onPress={() => {
                    setItems([]);
                    setShowSettingsModal(false);
                  }}
                >
                  <Text style={styles.settingsButtonText2}>
                    🗑️ Clear All Items
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.settingsButton2}
                  onPress={() => {
                    setItems(
                      items.map((item) => ({ ...item, completed: false })),
                    );
                    setShowSettingsModal(false);
                  }}
                >
                  <Text style={styles.settingsButtonText2}>
                    ↩️ Mark All Incomplete
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.settingsButton2}
                  onPress={() => {
                    setDailyBudget(0);
                    setShowSettingsModal(false);
                  }}
                >
                  <Text style={styles.settingsButtonText2}>
                    💰 Reset Budget
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Follow Me</Text>
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={() =>
                    Linking.openURL("https://github.com/sharkytailer")
                  }
                >
                  <Text style={styles.socialButtonText}>🐙 GitHub</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={() =>
                    Linking.openURL("https://instagram.com/da_egoistic.1")
                  }
                >
                  <Text style={styles.socialButtonText}>📸 Instagram</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={() =>
                    Linking.openURL("https://youtube.com/@sharkytailer")
                  }
                >
                  <Text style={styles.socialButtonText}>📺 YouTube</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={itemToDelete !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelDeleteItem}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContainer}>
            <Text style={styles.deleteModalTitle}>Delete Item</Text>
            <Text style={styles.deleteModalMessage}>
              Are you sure you want to delete this item?
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                onPress={cancelDeleteItem}
                style={styles.deleteModalCancelButton}
              >
                <Text style={styles.deleteModalCancelText}>No</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmDeleteItem}
                style={styles.deleteModalConfirmButton}
              >
                <Text style={styles.deleteModalConfirmText}>Yes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Styles for the app without the iPhone borders
const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  appRootModal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    backgroundColor: "#1976D2",
    paddingTop: 40, // Reduced from 40
    paddingBottom: 13, // Reduced from 15
    paddingHorizontal: 15,
    alignItems: "center", // Center text/items horizontally
  },
  headerTitle: {
    color: "white",
    fontSize: 18, // Reduced from 20
    fontWeight: "bold",
    marginBottom: 2, // Reduced from 5
  },
  headerSubtitle: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12, // Reduced from 12
  },
  // Budget styles
  budgetContainer: {
    backgroundColor: "white",
    margin: 10,
    padding: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  budgetContainerOverBudget: {
    backgroundColor: "#ffebee",
    borderColor: "#F44336",
    borderWidth: 1,
  },
  budgetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  budgetLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  budgetAmount: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  budgetAmountOver: {
    color: "#F44336",
  },
  budgetAmountRemaining: {
    color: "#4CAF50",
  },
  searchContainer: {
    backgroundColor: "white",
    margin: 10,
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchInput: {
    padding: 12,
    fontSize: 14,
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  actionButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  addButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  reportsButton: {
    backgroundColor: "#1976D2",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginLeft: "auto",
  },
  reportsButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  budgetButton: {
    backgroundColor: "#FF9800",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginLeft: "auto",
  },
  budgetButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  deleteButton: {
    backgroundColor: "#F44336",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  deleteButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  selectionActions: {
    flexDirection: "row",
    gap: 10,
  },
  cancelButton: {
    backgroundColor: "#757575",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  cancelButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  toggleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  toggleLabel: {
    marginRight: 8,
    fontSize: 14,
    color: "#666",
  },
  suggestionsContainer: {
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
  },
  suggestionChip: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
  },
  suggestionText: {
    color: "#1976D2",
    fontSize: 12,
    fontWeight: "500",
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 10,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyStateIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  categorySection: {
    marginBottom: 15,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "white",
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  categoryCount: {
    fontSize: 12,
    color: "#666",
  },
  itemContainer: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  itemCompleted: {
    opacity: 0.6,
  },
  itemSelected: {
    backgroundColor: "#ffebee",
    borderColor: "#F44336",
    borderWidth: 1,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#ddd",
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxCompleted: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  checkboxSelected: {
    backgroundColor: "#F44336",
    borderColor: "#F44336",
  },
  checkmark: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  selectionMark: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 2,
  },
  itemNameCompleted: {
    textDecorationLine: "line-through",
    color: "#999",
  },
  itemNameSelected: {
    color: "#F44336",
    fontWeight: "bold",
  },
  itemSubDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemQuantity: {
    fontSize: 12,
    color: "#666",
  },
  itemQuantitySelected: {
    color: "#F44336",
  },
  itemPrice: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "bold",
  },
  itemPriceSelected: {
    color: "#F44336",
  },
  itemNotes: {
    fontSize: 10,
    color: "#999",
    fontStyle: "italic",
    marginTop: 1,
  },
  itemNotesSelected: {
    color: "#F44336",
  },
  priorityIndicator: {
    width: 3,
    height: 25,
    borderRadius: 2,
  },
  // Total container at bottom
  totalContainer: {
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 23,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  totalContainerOverBudget: {
    backgroundColor: "#ffebee",
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  totalAmountOver: {
    color: "#F44336",
  },
  overBudgetWarning: {
    fontSize: 14,
    color: "#F44336",
    fontWeight: "bold",
  },
  // Modified modalContainer and added modalContainerWide
  modalContainer: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 12,
    width:
      screenWidth > 600 ? Math.min(screenWidth * 0.7, 420) : screenWidth * 0.9,
    alignSelf: "center",
    marginVertical: screenHeight * 0.1,
    maxHeight: screenHeight * 0.8,
    // Layout for modal on both phone/tablet/desktop
  },
  modalContainerWide: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 12,
    width:
      screenWidth > 600 ? Math.min(screenWidth * 0.8, 540) : screenWidth * 0.95,
    alignSelf: "center",
    marginVertical: screenHeight * 0.05,
    maxHeight: screenHeight * 0.9,
    // Layout for modal on both phone/tablet/desktop
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 30,
    paddingBottom: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalCancel: {
    color: "#666",
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  modalSave: {
    color: "#1976D2",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: "row",
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  categorySelector: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#f9f9f9",
  },
  categorySelectorIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  categorySelectorText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  categorySelectorArrow: {
    fontSize: 20,
    color: "#999",
  },
  priorityContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  priorityButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    marginHorizontal: 5,
    backgroundColor: "#f9f9f9",
  },
  priorityButtonSelected: {
    backgroundColor: "rgba(25, 118, 210, 0.1)",
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  categoryOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  categoryOptionSelected: {
    backgroundColor: "#f0f8ff",
  },
  categoryOptionIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  categoryOptionText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  categoryOptionCheck: {
    color: "#1976D2",
    fontSize: 18,
    fontWeight: "bold",
  },
  // Budget modal styles
  currentBudgetDisplay: {
    backgroundColor: "#f0f8ff",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  currentBudgetText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1976D2",
  },
  settingsButton: {
    position: "absolute",
    bottom: 20,
    top: 560,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1976D2",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  settingsButtonText: {
    fontSize: 20,
    color: "white",
    textAlign: "center",
    lineHeight: 20,
  },
  settingsItem: {
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  settingsItemText: {
    fontSize: 14,
    color: "#333",
  },
  settingsButton2: {
    backgroundColor: "#f44336",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: "center",
  },
  settingsButtonText2: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  socialButton: {
    backgroundColor: "#1976D2",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: "center",
  },
  socialButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  removeBudgetButton: {
    backgroundColor: "#F44336",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  removeBudgetButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  bottomToggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  completedToggleButton: {
    position: "absolute",
    bottom: 80, // Adjust position to be above the settings button
    top: 500,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1976D2",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  completedToggleButtonText: {
    fontSize: 20,
    color: "white",
    textAlign: "center",
    lineHeight: 20,
  },
  // New chart and reports styles
  summaryStatsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    flex: 1,
    marginHorizontal: 5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
  },
  timeframeContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  timeframeButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    marginHorizontal: 4,
  },
  timeframeButtonSelected: {
    backgroundColor: "#1976D2",
  },
  timeframeButtonText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  timeframeButtonTextSelected: {
    color: "white",
    fontWeight: "bold",
  },
  chartContainer: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chartArea: {
    flexDirection: "row",
    height: 220,
  },
  yAxisLabels: {
    justifyContent: "space-between",
    paddingRight: 10,
    height: 200,
    paddingTop: 10,
  },
  axisLabel: {
    fontSize: 10,
    color: "#666",
    textAlign: "right",
  },
  chartBars: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 200,
    paddingHorizontal: 5,
  },
  barContainer: {
    alignItems: "center",
    flex: 1,
  },
  chartBarArea: {
    justifyContent: "flex-end",
    alignItems: "center",
    position: "relative",
  },
  chartBar: {
    borderRadius: 4,
    minHeight: 2,
  },
  budgetLine: {
    position: "absolute",
    height: 2,
    backgroundColor: "#FF9800",
    left: -2,
  },
  xAxisLabel: {
    fontSize: 10,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },
  barValue: {
    fontSize: 9,
    color: "#333",
    fontWeight: "bold",
    marginTop: 2,
  },
  noDataContainer: {
    alignItems: "center",
    padding: 40,
    backgroundColor: "white",
    borderRadius: 8,
    marginBottom: 20,
  },
  noDataIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  noDataTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  noDataSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  budgetProgressContainer: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  progressBarContainer: {
    marginTop: 10,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
  },
  categoryBreakdownContainer: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  categoryBreakdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  categoryBreakdownLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  categoryColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  categoryBreakdownName: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  categoryBreakdownRight: {
    alignItems: "flex-end",
  },
  categoryBreakdownAmount: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  categoryBreakdownPercentage: {
    fontSize: 12,
    color: "#666",
  },
  insightsContainer: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  insightItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  insightIcon: {
    fontSize: 16,
    marginRight: 10,
    marginTop: 2,
  },
  insightText: {
    fontSize: 14,
    color: "#333",
    flex: 1,
    lineHeight: 20,
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteModalContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    width: 300,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 18,
  },
  deleteModalMessage: {
    fontSize: 16,
    color: "#444",
    marginBottom: 26,
    textAlign: "center",
  },
  deleteModalButtons: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
  },
  deleteModalCancelButton: {
    flex: 1,
    backgroundColor: "#F44336",
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 6,
    alignItems: "center",
  },
  deleteModalCancelText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  deleteModalConfirmButton: {
    flex: 1,
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 6,
    alignItems: "center",
  },
  deleteModalConfirmText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});
