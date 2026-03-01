import { useState } from "react";
import { Calendar as CalendarIcon, Clock, Search, Camera, X, Image as ImageIcon } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useData } from "../context/DataContext";
import { Badge } from "./ui/badge";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { formatLocalDate } from "../../utils/dateUtils";

export function Attendance() {
  const { children, attendance, checkIn, checkOut, markAbsent, addActivityPhoto, deleteActivityPhoto, getActivityPhotos } = useData();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState("");
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [selectedChildForPhoto, setSelectedChildForPhoto] = useState<{ id: string; name: string } | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [photoCaption, setPhotoCaption] = useState("");

  const activeChildren = children.filter(c => c.status === 'active');
  const filteredChildren = activeChildren.filter(child =>
    `${child.firstName} ${child.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAttendanceForChild = (childId: string) => {
    // Only return attendance for the exact selected date
    return attendance.find(
      a => a.childId === childId && a.date === selectedDate
    );
  };

  const handleCheckIn = (childId: string, childName: string) => {
    const now = new Date();
    const time = now.toTimeString().split(' ')[0].substring(0, 5);
    checkIn(childId, selectedDate, time);
    toast.success(`${childName} checked in at ${time}`);
  };

  const handleCheckOut = (childId: string, childName: string) => {
    const attendanceRecord = getAttendanceForChild(childId);
    if (attendanceRecord) {
      const now = new Date();
      const time = now.toTimeString().split(' ')[0].substring(0, 5);
      checkOut(attendanceRecord.id, time);
      toast.success(`${childName} checked out at ${time}`);
    }
  };

  const handleMarkAbsent = (childId: string, childName: string) => {
    markAbsent(childId, selectedDate);
    toast.info(`${childName} marked as absent`);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSavePhoto = () => {
    if (!selectedChildForPhoto || !photoPreview) return;
    
    addActivityPhoto({
      childId: selectedChildForPhoto.id,
      date: selectedDate,
      photo: photoPreview,
      caption: photoCaption,
    });
    
    toast.success(`Photo added for ${selectedChildForPhoto.name}`);
    setPhotoDialogOpen(false);
    setPhotoPreview("");
    setPhotoCaption("");
    setSelectedChildForPhoto(null);
  };

  const handleDeletePhoto = (photoId: string) => {
    if (confirm("Are you sure you want to delete this photo?")) {
      deleteActivityPhoto(photoId);
      toast.success("Photo deleted");
    }
  };

  const attendanceStats = {
    present: attendance.filter(a => a.date === selectedDate && a.checkIn && a.checkOut === null && a.status !== 'absent').length,
    checkedOut: attendance.filter(a => a.date === selectedDate && a.checkOut !== null).length,
    absent: attendance.filter(a => a.date === selectedDate && a.status === 'absent').length,
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-700 to-blue-600 text-white rounded-lg p-4 sm:p-6 shadow-lg">
        <h1 className="text-white text-xl sm:text-3xl">Attendance Tracking</h1>
        <p className="text-blue-50 text-xs sm:text-base">Track daily check-ins and check-outs</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-900">Present</CardTitle>
            <Badge className="bg-green-600">{attendanceStats.present}</Badge>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-blue-700">Currently checked in</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-900">Checked Out</CardTitle>
            <Badge className="bg-blue-600">{attendanceStats.checkedOut}</Badge>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-blue-700">Already departed</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-900">Absent</CardTitle>
            <Badge variant="secondary">{attendanceStats.absent}</Badge>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-blue-700">Marked absent</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
          />
        </div>
        <div className="flex-1 flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search children..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Children Roster - {formatLocalDate(selectedDate)}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredChildren.map((child) => {
              const attendanceRecord = getAttendanceForChild(child.id);
              const isCheckedIn = attendanceRecord && attendanceRecord.checkIn && !attendanceRecord.checkOut && attendanceRecord.status !== 'absent';
              const isCheckedOut = attendanceRecord && attendanceRecord.checkOut;
              const isAbsent = attendanceRecord && attendanceRecord.status === 'absent';

              return (
                <div
                  key={child.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base">{child.firstName} {child.lastName}</p>
                    <div className="flex items-center gap-2 sm:gap-4 mt-1 text-xs sm:text-sm text-muted-foreground">
                      {attendanceRecord && attendanceRecord.checkIn && (
                        <>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            In: {attendanceRecord.checkIn}
                          </span>
                          {attendanceRecord.checkOut && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Out: {attendanceRecord.checkOut}
                            </span>
                          )}
                        </>
                      )}
                      {isAbsent && (
                        <span className="text-blue-700 italic">Marked as absent</span>
                      )}
                      {!attendanceRecord && (
                        <span className="text-gray-500 italic">Not checked in yet</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {!attendanceRecord && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleCheckIn(child.id, `${child.firstName} ${child.lastName}`)}
                          className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm"
                        >
                          Check In
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkAbsent(child.id, `${child.firstName} ${child.lastName}`)}
                          className="text-xs sm:text-sm"
                        >
                          Mark Absent
                        </Button>
                      </>
                    )}
                    {isCheckedIn && (
                      <>
                        <Badge className="bg-green-600">Present</Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCheckOut(child.id, `${child.firstName} ${child.lastName}`)}
                          className="text-xs sm:text-sm"
                        >
                          Check Out
                        </Button>
                      </>
                    )}
                    {isCheckedOut && (
                      <Badge className="bg-blue-600">Checked Out</Badge>
                    )}
                    {isAbsent && (
                      <Badge variant="destructive">Absent</Badge>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredChildren.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No children found. Add children in the Children Management section.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Daily Activity Photos */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <CardTitle className="text-base sm:text-lg">Today's Activity Photos</CardTitle>
          <p className="text-xs sm:text-sm text-muted-foreground">Share photos of daily activities with parents</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeChildren.map((child) => {
              const photos = getActivityPhotos(child.id, selectedDate);
              return (
                <Card key={child.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{child.firstName} {child.lastName}</CardTitle>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedChildForPhoto({ id: child.id, name: `${child.firstName} ${child.lastName}` });
                          setPhotoDialogOpen(true);
                        }}
                      >
                        <Camera className="h-4 w-4 mr-1" />
                        Add Photo
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {photos.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {photos.map((photo) => (
                          <div key={photo.id} className="relative group">
                            <img
                              src={photo.photo}
                              alt={photo.caption || "Activity photo"}
                              className="w-full h-32 object-cover rounded-md"
                            />
                            <Button
                              variant="destructive"
                              size="sm"
                              className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleDeletePhoto(photo.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                            {photo.caption && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{photo.caption}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {new Date(photo.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-200 rounded-md">
                        <ImageIcon className="h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">No photos yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Photo Upload Dialog */}
      <Dialog open={photoDialogOpen} onOpenChange={(open) => {
        setPhotoDialogOpen(open);
        if (!open) {
          setPhotoPreview("");
          setPhotoCaption("");
          setSelectedChildForPhoto(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Activity Photo</DialogTitle>
            <DialogDescription>
              Upload a photo of {selectedChildForPhoto?.name}'s activities today
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Photo</Label>
              {photoPreview ? (
                <div className="relative">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-full h-64 object-cover rounded-md"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => setPhotoPreview("")}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              ) : (
                <Label htmlFor="photo-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-md hover:border-blue-400 transition-colors">
                    <Camera className="h-12 w-12 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">Click to upload photo</span>
                  </div>
                </Label>
              )}
              <Input
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="caption">Caption (Optional)</Label>
              <Textarea
                id="caption"
                value={photoCaption}
                onChange={(e) => setPhotoCaption(e.target.value)}
                placeholder="Describe the activity..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setPhotoDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-blue-700 hover:bg-blue-800"
                onClick={handleSavePhoto}
                disabled={!photoPreview}
              >
                Save Photo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}