import { useState, useRef } from "react";
import { Baby, Smile, Frown, Meh, Zap, Heart, Plus, Trash2, Clock, Save, Edit, X, Camera, Image } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { useData } from "../context/DataContext";
import type { DailyActivity } from "../context/DataContext";
import { formatLocalDate, getTodayString } from "../../utils/dateUtils";
import { toast } from "sonner";

export function Activities() {
  const { children, activityPhotos, addDailyActivity, updateDailyActivity, getDailyActivity, addActivityPhoto, deleteActivityPhoto, getActivityPhotos } = useData();
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [searchTerm, setSearchTerm] = useState("");
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Filter children based on search
  const filteredChildren = children.filter(child =>
    child.status === "active" &&
    `${child.firstName} ${child.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddBathroomTime = (childId: string) => {
    const currentTime = new Date().toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    const activity = getDailyActivity(childId, selectedDate);
    
    if (activity) {
      updateDailyActivity(activity.id, {
        bathroomTimes: [...activity.bathroomTimes, currentTime]
      });
    } else {
      addDailyActivity({
        childId,
        date: selectedDate,
        bathroomTimes: [currentTime],
        mood: "",
        teacherNotes: ""
      });
    }
  };

  const handleRemoveBathroomTime = (childId: string, index: number) => {
    const activity = getDailyActivity(childId, selectedDate);
    if (activity) {
      const newTimes = activity.bathroomTimes.filter((_, i) => i !== index);
      updateDailyActivity(activity.id, {
        bathroomTimes: newTimes
      });
    }
  };

  const handleNapTimeChange = (childId: string, type: 'start' | 'end', value: string) => {
    const activity = getDailyActivity(childId, selectedDate);
    
    if (activity) {
      updateDailyActivity(activity.id, {
        [type === 'start' ? 'napStart' : 'napEnd']: value
      });
    } else {
      addDailyActivity({
        childId,
        date: selectedDate,
        bathroomTimes: [],
        [type === 'start' ? 'napStart' : 'napEnd']: value,
        mood: "",
        teacherNotes: ""
      });
    }
  };

  const handleMoodChange = (childId: string, mood: DailyActivity['mood']) => {
    const activity = getDailyActivity(childId, selectedDate);
    
    if (activity) {
      updateDailyActivity(activity.id, { mood });
    } else {
      addDailyActivity({
        childId,
        date: selectedDate,
        bathroomTimes: [],
        mood,
        teacherNotes: ""
      });
    }
  };

  const handleNotesChange = (childId: string, notes: string) => {
    const activity = getDailyActivity(childId, selectedDate);
    
    if (activity) {
      updateDailyActivity(activity.id, { teacherNotes: notes });
    } else {
      addDailyActivity({
        childId,
        date: selectedDate,
        bathroomTimes: [],
        mood: "",
        teacherNotes: notes
      });
    }
  };

  const getMoodIcon = (mood: DailyActivity['mood']) => {
    switch (mood) {
      case 'happy':
        return <Smile className="h-5 w-5" />;
      case 'sad':
        return <Frown className="h-5 w-5" />;
      case 'cranky':
        return <Meh className="h-5 w-5" />;
      case 'energetic':
        return <Zap className="h-5 w-5" />;
      case 'calm':
        return <Heart className="h-5 w-5" />;
      default:
        return null;
    }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new window.Image();
        img.onload = () => {
          // Target max dimension 800px, JPEG quality 0.7 — keeps base64 well under 500KB
          const MAX = 800;
          let { width, height } = img;
          if (width > MAX || height > MAX) {
            if (width > height) {
              height = Math.round((height * MAX) / width);
              width = MAX;
            } else {
              width = Math.round((width * MAX) / height);
              height = MAX;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = reject;
        img.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoUpload = async (childId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Reset the input early so re-selecting the same file works
    event.target.value = '';

    try {
      const compressed = await compressImage(file);
      await addActivityPhoto({
        childId,
        date: selectedDate,
        photo: compressed,
        caption: '',
      });
      toast.success('Photo added successfully');
    } catch (err) {
      console.error('Photo upload error:', err);
      toast.error('Failed to upload photo. Please try again.');
    }
  };

  const handleDeletePhoto = (photoId: string) => {
    if (confirm('Are you sure you want to delete this photo?')) {
      deleteActivityPhoto(photoId);
      toast.success('Photo deleted');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="mb-1">Daily Activities</h1>
        <p className="text-muted-foreground">
          Track bathroom, nap time, mood, and teacher notes for each child
        </p>
      </div>

      {/* Date and Search Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search Children</Label>
              <Input
                id="search"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full md:w-auto"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Children Activity Cards */}
      <div className="grid gap-6">
        {filteredChildren.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Baby className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">No Children Found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? "Try adjusting your search" : "No active children in the system"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredChildren.map((child) => {
            const activity = getDailyActivity(child.id, selectedDate);
            const isEditing = editingChildId === child.id;

            return (
              <Card key={child.id} className={isEditing ? "border-blue-300 ring-2 ring-blue-100" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {child.photo ? (
                        <img
                          src={child.photo}
                          alt={`${child.firstName} ${child.lastName}`}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100">
                          <Baby className="h-6 w-6 text-blue-700" />
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-lg">
                          {child.firstName} {child.lastName}
                        </CardTitle>
                        <CardDescription>
                          Born: {formatLocalDate(child.dateOfBirth)}
                        </CardDescription>
                      </div>
                    </div>
                    {/* Edit/Cancel Button */}
                    {!isEditing ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingChildId(child.id)}
                        className="text-blue-700 border-blue-200 hover:bg-blue-50"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingChildId(null)}
                        className="text-gray-600 hover:bg-gray-50"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Bathroom Times */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-base font-semibold">Bathroom Times</Label>
                      {isEditing && (
                        <Button
                          size="sm"
                          onClick={() => handleAddBathroomTime(child.id)}
                          className="bg-blue-700 hover:bg-blue-800"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Time
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {activity?.bathroomTimes.length ? (
                        activity.bathroomTimes.map((time, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="flex items-center gap-2 px-3 py-1.5"
                          >
                            <Clock className="h-3 w-3" />
                            {time}
                            {isEditing && (
                              <button
                                onClick={() => handleRemoveBathroomTime(child.id, index)}
                                className="ml-1 hover:text-blue-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No bathroom times recorded</p>
                      )}
                    </div>
                  </div>

                  {/* Nap Time */}
                  <div>
                    <Label className="text-base font-semibold mb-3 block">Nap Time</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`nap-start-${child.id}`} className="text-sm">Start Time</Label>
                        <Input
                          id={`nap-start-${child.id}`}
                          type="time"
                          value={activity?.napStart || ""}
                          onChange={(e) => handleNapTimeChange(child.id, 'start', e.target.value)}
                          disabled={!isEditing}
                          className={!isEditing ? "bg-gray-50" : ""}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`nap-end-${child.id}`} className="text-sm">End Time</Label>
                        <Input
                          id={`nap-end-${child.id}`}
                          type="time"
                          value={activity?.napEnd || ""}
                          onChange={(e) => handleNapTimeChange(child.id, 'end', e.target.value)}
                          disabled={!isEditing}
                          className={!isEditing ? "bg-gray-50" : ""}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Mood/Behavior */}
                  <div>
                    <Label className="text-base font-semibold mb-3 block">Mood/Behavior</Label>
                    <div className="flex flex-wrap gap-2">
                      {(['happy', 'sad', 'cranky', 'energetic', 'calm'] as const).map((mood) => (
                        <Button
                          key={mood}
                          variant={activity?.mood === mood ? "default" : "outline"}
                          size="sm"
                          onClick={() => isEditing && handleMoodChange(child.id, mood)}
                          disabled={!isEditing}
                          className={activity?.mood === mood ? "bg-blue-700 hover:bg-blue-800" : !isEditing ? "opacity-60" : ""}
                        >
                          {getMoodIcon(mood)}
                          <span className="ml-2 capitalize">{mood}</span>
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Teacher Notes */}
                  <div>
                    <Label htmlFor={`notes-${child.id}`} className="text-base font-semibold">
                      Teacher Notes
                    </Label>
                    <Textarea
                      id={`notes-${child.id}`}
                      placeholder={isEditing ? "Enter notes about the child's day..." : "No notes recorded"}
                      value={activity?.teacherNotes || ""}
                      onChange={(e) => handleNotesChange(child.id, e.target.value)}
                      rows={4}
                      className={`mt-2 ${!isEditing ? "bg-gray-50" : ""}`}
                      disabled={!isEditing}
                    />
                  </div>

                  {/* Photos */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-base font-semibold flex items-center gap-2">
                        <Camera className="h-4 w-4" />
                        Photos — {selectedDate === getTodayString() ? 'Today' : formatLocalDate(selectedDate)}
                      </Label>
                      {isEditing && (
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handlePhotoUpload(child.id, e)}
                            className="hidden"
                            ref={(el) => { fileInputRefs.current[child.id] = el; }}
                            id={`photo-upload-${child.id}`}
                          />
                          <Button
                            size="sm"
                            onClick={() => fileInputRefs.current[child.id]?.click()}
                            className="bg-blue-700 hover:bg-blue-800"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Photo
                          </Button>
                        </div>
                      )}
                    </div>

                    {(() => {
                      const photos = getActivityPhotos(child.id, selectedDate).filter(p => p.photo);
                      const otherDatesCount = activityPhotos.filter(p => p.childId === child.id && p.date !== selectedDate && p.photo).length;
                      return photos.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {photos.map((photo) => (
                            <div key={photo.id} className="relative group">
                              <img
                                src={photo.photo}
                                alt={`Activity photo for ${child.firstName}`}
                                className="w-full h-24 object-cover rounded-lg border"
                              />
                              {isEditing && (
                                <button
                                  onClick={() => handleDeletePhoto(photo.id)}
                                  className="absolute top-1 right-1 p-1 bg-blue-700 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                              <p className="text-xs text-muted-foreground mt-1 text-center">
                                {new Date(photo.uploadedAt).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true,
                                  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                                })}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center p-6 border-2 border-dashed rounded-lg bg-gray-50">
                          <div className="text-center">
                            <Image className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                            <p className="text-sm text-muted-foreground">
                              No photos for {selectedDate === getTodayString() ? 'today' : 'this date'}
                            </p>
                            {otherDatesCount > 0 && (
                              <p className="text-xs text-blue-600 mt-1">
                                {otherDatesCount} photo{otherDatesCount !== 1 ? 's' : ''} on other dates — change the date above to view
                              </p>
                            )}
                            {isEditing && (
                              <p className="text-xs text-muted-foreground mt-1">Click "Add Photo" to upload</p>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Save Button - Only show when editing */}
                  {isEditing && (
                    <div className="pt-4 border-t flex justify-end">
                      <Button
                        size="sm"
                        onClick={() => {
                          toast.success(`Activities saved for ${child.firstName} ${child.lastName}`);
                          setEditingChildId(null);
                        }}
                        className="bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700"
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}