import { useState } from "react";
import { Plus, Search, Edit, Trash2, UtensilsCrossed, Check } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useData } from "../context/DataContext";
import { Badge } from "./ui/badge";
import { toast } from "sonner";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";

export function MealMenu() {
  const { mealMenus, addMealMenu, updateMealMenu, deleteMealMenu } = useData();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<string | null>(null);
  const [filterDay, setFilterDay] = useState<string>("all");
  const [filterMealType, setFilterMealType] = useState<string>("all");
  const [formData, setFormData] = useState({
    day: "",
    mealType: "",
    menuName: "",
    description: "",
    allergens: "",
  });
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const mealTypes = ["Breakfast", "Lunch", "Snack", "Dinner"];

  const filteredMenus = mealMenus.filter(menu => {
    const matchesSearch = 
      menu.menuName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      menu.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDay = filterDay === "all" || menu.day === filterDay;
    const matchesMealType = filterMealType === "all" || menu.mealType === filterMealType;
    return matchesSearch && matchesDay && matchesMealType;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingMenu) {
      // When editing, just update the single menu
      updateMealMenu(editingMenu, formData);
      toast.success("Meal menu updated successfully");
    } else {
      // When adding new, create menu for each selected day
      const daysToAdd = selectedDays.length > 0 ? selectedDays : [formData.day];

      if (daysToAdd.length === 0 || (daysToAdd.length === 1 && !daysToAdd[0])) {
        toast.error("Please select at least one day");
        return;
      }

      // Add menus with a small delay between each to ensure unique IDs
      daysToAdd.forEach((day, index) => {
        setTimeout(() => {
          addMealMenu({
            ...formData,
            day: day,
          });
        }, index * 10); // Small delay to ensure unique timestamps
      });

      if (daysToAdd.length > 1) {
        toast.success(`Meal menu added to ${daysToAdd.length} days`);
      } else {
        toast.success("Meal menu added successfully");
      }
    }

    setFormData({
      day: "",
      mealType: "",
      menuName: "",
      description: "",
      allergens: "",
    });
    setSelectedDays([]);
    setEditingMenu(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (menu: any) => {
    setFormData({
      day: menu.day,
      mealType: menu.mealType,
      menuName: menu.menuName,
      description: menu.description,
      allergens: menu.allergens,
    });
    setSelectedDays([menu.day]); // Set the single day when editing
    setEditingMenu(menu.id);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this meal menu?")) {
      deleteMealMenu(id);
      toast.success("Meal menu deleted successfully");
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingMenu(null);
    setSelectedDays([]);
    setFormData({
      day: "",
      mealType: "",
      menuName: "",
      description: "",
      allergens: "",
    });
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const selectAllDays = () => {
    if (selectedDays.length === daysOfWeek.length) {
      setSelectedDays([]);
    } else {
      setSelectedDays([...daysOfWeek]);
    }
  };

  // Group menus by day and meal type for organized display
  const groupedMenus = daysOfWeek.reduce((acc, day) => {
    acc[day] = mealTypes.reduce((mealAcc, mealType) => {
      mealAcc[mealType] = filteredMenus.filter(
        menu => menu.day === day && menu.mealType === mealType
      );
      return mealAcc;
    }, {} as Record<string, typeof filteredMenus>);
    return acc;
  }, {} as Record<string, Record<string, typeof filteredMenus>>);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-700 to-blue-600 text-white rounded-lg p-4 sm:p-6 shadow-lg">
        <h1 className="text-white text-xl sm:text-3xl">Meal Menu</h1>
        <p className="text-blue-50 text-xs sm:text-base">Manage weekly meal plans and menus</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search menus..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={filterDay} onValueChange={setFilterDay}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by day" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Days</SelectItem>
            {daysOfWeek.map(day => (
              <SelectItem key={day} value={day}>{day}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterMealType} onValueChange={setFilterMealType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by meal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Meals</SelectItem>
            {mealTypes.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-700 hover:bg-blue-800" onClick={() => setEditingMenu(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Menu
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingMenu ? "Edit Meal Menu" : "Add New Meal Menu"}</DialogTitle>
              <DialogDescription>
                {editingMenu ? "Update the meal menu details." : "Add a new meal to the weekly menu."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{editingMenu ? "Day of Week" : "Day(s) of Week"}</Label>
                  {!editingMenu && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs text-blue-700 hover:text-blue-800 h-auto p-0"
                      onClick={selectAllDays}
                    >
                      {selectedDays.length === daysOfWeek.length ? "Deselect All" : "Select All"}
                    </Button>
                  )}
                </div>

                {editingMenu ? (
                  // Single select when editing
                  <Select value={formData.day} onValueChange={(value) => setFormData({ ...formData, day: value })} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      {daysOfWeek.map(day => (
                        <SelectItem key={day} value={day}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  // Multi-select checkboxes when adding
                  <div className="grid grid-cols-2 gap-2 p-3 border rounded-md bg-gray-50">
                    {daysOfWeek.map(day => (
                      <div key={day} className="flex items-center space-x-2">
                        <Checkbox
                          id={`day-${day}`}
                          checked={selectedDays.includes(day)}
                          onCheckedChange={() => toggleDay(day)}
                        />
                        <label
                          htmlFor={`day-${day}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {day}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
                {!editingMenu && selectedDays.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Selected: {selectedDays.join(", ")}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="mealType">Meal Type</Label>
                <Select value={formData.mealType} onValueChange={(value) => setFormData({ ...formData, mealType: value })} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select meal type" />
                  </SelectTrigger>
                  <SelectContent>
                    {mealTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="menuName">Menu Name</Label>
                <Input
                  id="menuName"
                  value={formData.menuName}
                  onChange={(e) => setFormData({ ...formData, menuName: e.target.value })}
                  placeholder="e.g., Spaghetti and Meatballs"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Include ingredients, sides, and preparation details..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="allergens">Allergens (if any)</Label>
                <Input
                  id="allergens"
                  value={formData.allergens}
                  onChange={(e) => setFormData({ ...formData, allergens: e.target.value })}
                  placeholder="e.g., Milk, Eggs, Wheat"
                />
              </div>

              <div className="flex gap-3 justify-end">
                <Button type="button" variant="outline" onClick={handleDialogClose}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-700 hover:bg-blue-800">
                  {editingMenu ? "Update" : "Add"} Menu
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Weekly View */}
      <div className="space-y-6">
        {daysOfWeek.map(day => {
          const dayMenus = groupedMenus[day];
          const hasMeals = Object.values(dayMenus).some(meals => meals.length > 0);
          
          // Skip days with no meals when filtering
          if ((filterDay !== "all" && filterDay !== day) || (!hasMeals && (filterDay !== "all" || searchTerm))) {
            return null;
          }

          return (
            <Card key={day} className="border-blue-200">
              <CardHeader className="bg-blue-50 border-b border-blue-100">
                <CardTitle className="text-blue-900 flex items-center gap-2">
                  <UtensilsCrossed className="h-5 w-5" />
                  {day}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {!hasMeals ? (
                  <p className="text-center text-muted-foreground py-4">No meals scheduled for this day</p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {mealTypes.map(mealType => {
                      const meals = dayMenus[mealType];
                      
                      if (meals.length === 0 && filterMealType !== "all" && filterMealType !== mealType) {
                        return null;
                      }

                      return (
                        <div key={mealType} className="space-y-2">
                          <h3 className="font-semibold text-sm text-blue-800 uppercase tracking-wide">
                            {mealType}
                          </h3>
                          {meals.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">Not set</p>
                          ) : (
                            meals.map(menu => (
                              <div key={menu.id} className="p-3 border rounded-lg bg-white hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <h4 className="font-medium text-sm">{menu.menuName}</h4>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 hover:bg-blue-100"
                                      onClick={() => handleEdit(menu)}
                                    >
                                      <Edit className="h-3 w-3 text-blue-700" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 hover:bg-blue-100"
                                      onClick={() => handleDelete(menu.id)}
                                    >
                                      <Trash2 className="h-3 w-3 text-blue-700" />
                                    </Button>
                                  </div>
                                </div>
                                {menu.description && (
                                  <p className="text-xs text-muted-foreground mb-2">{menu.description}</p>
                                )}
                                {menu.allergens && (
                                  <Badge variant="destructive" className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-200">
                                    Allergens: {menu.allergens}
                                  </Badge>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredMenus.length === 0 && (
        <Card className="border-blue-200">
          <CardContent className="py-12">
            <div className="text-center">
              <UtensilsCrossed className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No meal menus found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchTerm || filterDay !== "all" || filterMealType !== "all"
                  ? "Try adjusting your filters"
                  : "Get started by adding your first meal menu"}
              </p>
              {!searchTerm && filterDay === "all" && filterMealType === "all" && (
                <Button className="bg-blue-700 hover:bg-blue-800" onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Menu
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
