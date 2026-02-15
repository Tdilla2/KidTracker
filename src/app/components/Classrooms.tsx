import { useState } from "react";
import { School, Plus, Edit, Trash2, Users, Baby } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useData } from "../context/DataContext";
import type { Classroom } from "../context/DataContext";
import { toast } from "sonner";
import { parseLocalDate } from "../../utils/dateUtils";

const AGE_GROUP_OPTIONS = [
  { value: "0-1 years", label: "0-1 years (Infants)" },
  { value: "1-2 years", label: "1-2 years (Young Toddlers)" },
  { value: "2-3 years", label: "2-3 years (Toddlers)" },
  { value: "3-4 years", label: "3-4 years (Preschool)" },
  { value: "4-5 years", label: "4-5 years (Pre-K)" },
  { value: "5+ years", label: "5+ years (School Age)" },
];

const getChildAgeInYears = (dateOfBirth: string): number => {
  const birthDate = parseLocalDate(dateOfBirth);
  return (new Date().getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
};

const parseAgeGroup = (ageGroup: string): { min: number; max: number } | null => {
  if (!ageGroup) return null;
  const plusMatch = ageGroup.match(/(\d+)\+/);
  if (plusMatch) return { min: parseInt(plusMatch[1]), max: Infinity };
  const rangeMatch = ageGroup.match(/(\d+)\s*-\s*(\d+)/);
  if (rangeMatch) return { min: parseInt(rangeMatch[1]), max: parseInt(rangeMatch[2]) };
  return null;
};

const isChildEligibleForClassroom = (childDob: string, classroomAgeGroup: string): boolean => {
  const range = parseAgeGroup(classroomAgeGroup);
  if (!range) return true;
  const childAge = getChildAgeInYears(childDob);
  return childAge >= range.min && childAge < range.max;
};

export function Classrooms() {
  const { classrooms, children, addClassroom, updateClassroom, deleteClassroom, updateChild } = useData();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    ageGroup: "",
    capacity: "",
    teacherName: "",
    description: "",
    status: "active" as "active" | "inactive",
  });

  const handleOpenDialog = (classroom?: Classroom) => {
    if (classroom) {
      setEditingClassroom(classroom);
      setFormData({
        name: classroom.name,
        ageGroup: classroom.ageGroup,
        capacity: classroom.capacity.toString(),
        teacherName: classroom.teacherName,
        description: classroom.description,
        status: classroom.status,
      });
    } else {
      setEditingClassroom(null);
      setFormData({
        name: "",
        ageGroup: "",
        capacity: "",
        teacherName: "",
        description: "",
        status: "active",
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.ageGroup || !formData.capacity || !formData.teacherName) {
      alert("Please fill in all required fields");
      return;
    }

    if (editingClassroom) {
      updateClassroom(editingClassroom.id, {
        name: formData.name,
        ageGroup: formData.ageGroup,
        capacity: parseInt(formData.capacity),
        teacherName: formData.teacherName,
        description: formData.description,
        status: formData.status,
      });
    } else {
      addClassroom({
        name: formData.name,
        ageGroup: formData.ageGroup,
        capacity: parseInt(formData.capacity),
        teacherName: formData.teacherName,
        description: formData.description,
        status: formData.status,
      });
    }

    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this classroom? Children will be unassigned.")) {
      // Unassign all children from this classroom
      children
        .filter(child => child.classroomId === id)
        .forEach(child => updateChild(child.id, { classroomId: undefined }));
      
      deleteClassroom(id);
    }
  };

  const handleOpenAssignDialog = (classroom: Classroom) => {
    setSelectedClassroom(classroom);
    setAssignDialogOpen(true);
  };

  const handleAssignChild = (childId: string, classroomId: string) => {
    updateChild(childId, { classroomId });
  };

  const handleUnassignChild = (childId: string) => {
    updateChild(childId, { classroomId: undefined });
  };

  const getClassroomChildren = (classroomId: string) => {
    return children.filter(child => child.classroomId === classroomId && child.status === "active");
  };

  const getUnassignedChildren = () => {
    return children.filter(child => !child.classroomId && child.status === "active");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-1">Classrooms</h1>
          <p className="text-muted-foreground">
            Manage classrooms and assign children to classes
          </p>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-blue-700 hover:bg-blue-800"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Classroom
        </Button>
      </div>

      {/* Classrooms Grid */}
      {classrooms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <School className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">No Classrooms Yet</h3>
            <p className="text-muted-foreground mb-4">
              Get started by creating your first classroom
            </p>
            <Button onClick={() => handleOpenDialog()} className="bg-blue-700 hover:bg-blue-800">
              <Plus className="mr-2 h-4 w-4" />
              Add Classroom
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {classrooms.map((classroom) => {
            const classroomChildren = getClassroomChildren(classroom.id);
            const occupancyPercentage = (classroomChildren.length / classroom.capacity) * 100;
            
            return (
              <Card key={classroom.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100">
                        <School className="h-6 w-6 text-blue-700" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{classroom.name}</CardTitle>
                        <CardDescription>{classroom.ageGroup}</CardDescription>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        classroom.status === "active"
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-gray-500 bg-gray-50 text-gray-700"
                      }
                    >
                      {classroom.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Teacher:</span> {classroom.teacherName}
                    </div>
                    <div className="flex items-center gap-2">
                      <Baby className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Capacity:</span>{" "}
                      {classroomChildren.length}/{classroom.capacity}
                      <span className="text-muted-foreground">
                        ({Math.round(occupancyPercentage)}% full)
                      </span>
                    </div>
                    {classroom.description && (
                      <p className="text-muted-foreground mt-2">{classroom.description}</p>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        occupancyPercentage >= 100
                          ? "bg-blue-700"
                          : occupancyPercentage >= 80
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      }`}
                      style={{ width: `${Math.min(occupancyPercentage, 100)}%` }}
                    />
                  </div>

                  {/* Children List */}
                  <div>
                    <p className="text-sm font-medium mb-2">Enrolled Children:</p>
                    {classroomChildren.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No children assigned</p>
                    ) : (
                      <div className="space-y-1">
                        {classroomChildren.map((child) => (
                          <div
                            key={child.id}
                            className="text-sm flex items-center justify-between bg-gray-50 px-2 py-1 rounded"
                          >
                            <span>{child.firstName} {child.lastName}</span>
                            <button
                              onClick={() => handleUnassignChild(child.id)}
                              className="text-blue-700 hover:text-blue-800"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenAssignDialog(classroom)}
                      className="flex-1"
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Assign Children
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(classroom)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(classroom.id)}
                      className="text-blue-700 hover:text-blue-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Unassigned Children Section */}
      {getUnassignedChildren().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Unassigned Children</CardTitle>
            <CardDescription>
              These children are not assigned to any classroom
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {getUnassignedChildren().map((child) => (
                <div
                  key={child.id}
                  className="flex items-center justify-between bg-yellow-50 border border-yellow-200 px-3 py-2 rounded"
                >
                  <div className="flex items-center gap-2">
                    {child.photo ? (
                      <img
                        src={child.photo}
                        alt={`${child.firstName} ${child.lastName}`}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100">
                        <Baby className="h-4 w-4 text-blue-700" />
                      </div>
                    )}
                    <span className="font-medium">{child.firstName} {child.lastName}</span>
                  </div>
                  {(() => {
                    const eligibleClassrooms = classrooms.filter(
                      c => c.status === "active" && isChildEligibleForClassroom(child.dateOfBirth, c.ageGroup)
                    );
                    return eligibleClassrooms.length > 0 ? (
                      <Select onValueChange={(value) => handleAssignChild(child.id, value)}>
                        <SelectTrigger className="w-[140px] h-8">
                          <SelectValue placeholder="Assign..." />
                        </SelectTrigger>
                        <SelectContent>
                          {eligibleClassrooms.map((classroom) => (
                            <SelectItem key={classroom.id} value={classroom.id}>
                              {classroom.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-xs text-red-500 w-[140px] text-right">
                        No eligible classrooms
                      </span>
                    );
                  })()}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Classroom Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingClassroom ? "Edit Classroom" : "Add New Classroom"}
            </DialogTitle>
            <DialogDescription>
              {editingClassroom
                ? "Update classroom information"
                : "Create a new classroom for your daycare"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Classroom Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Sunshine Room"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="ageGroup">Age Group *</Label>
              <Select
                value={formData.ageGroup}
                onValueChange={(value) => setFormData({ ...formData, ageGroup: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select age group" />
                </SelectTrigger>
                <SelectContent>
                  {AGE_GROUP_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="capacity">Capacity *</Label>
              <Input
                id="capacity"
                type="number"
                min="1"
                placeholder="e.g., 12"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="teacherName">Teacher Name *</Label>
              <Input
                id="teacherName"
                placeholder="e.g., Ms. Johnson"
                value={formData.teacherName}
                onChange={(e) => setFormData({ ...formData, teacherName: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description of the classroom"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: "active" | "inactive") =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="bg-blue-700 hover:bg-blue-800">
              {editingClassroom ? "Update" : "Create"} Classroom
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Children Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Children to {selectedClassroom?.name}</DialogTitle>
            <DialogDescription>
              Select children to add to this classroom
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {getUnassignedChildren().length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No unassigned children available
              </p>
            ) : (
              getUnassignedChildren().map((child) => {
                const eligible = selectedClassroom
                  ? isChildEligibleForClassroom(child.dateOfBirth, selectedClassroom.ageGroup)
                  : true;
                const childAge = Math.floor(getChildAgeInYears(child.dateOfBirth));

                return (
                  <div
                    key={child.id}
                    className={`flex items-center justify-between p-3 border rounded ${
                      eligible ? "hover:bg-gray-50" : "opacity-60 bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {child.photo ? (
                        <img
                          src={child.photo}
                          alt={`${child.firstName} ${child.lastName}`}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
                          <Baby className="h-5 w-5 text-blue-700" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{child.firstName} {child.lastName}</p>
                        <p className="text-sm text-muted-foreground">
                          Age: {childAge} years
                        </p>
                        {!eligible && (
                          <p className="text-xs text-red-500">
                            Age does not match classroom group ({selectedClassroom?.ageGroup})
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      disabled={!eligible}
                      onClick={() => {
                        handleAssignChild(child.id, selectedClassroom?.id || "");
                      }}
                      className={eligible ? "bg-blue-700 hover:bg-blue-800" : ""}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Assign
                    </Button>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}