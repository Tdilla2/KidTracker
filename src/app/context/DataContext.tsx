import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "../../lib/api";
import { useAuth } from "./AuthContext";

// Type Definitions
export interface RecurringCharge {
  description: string;
  amount: number;
}

export interface Child {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  photo?: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  emergencyContact: string;
  emergencyPhone: string;
  emergencyContact2?: string;
  emergencyPhone2?: string;
  authorizedPickup1?: string;
  authorizedPickup1Phone?: string;
  authorizedPickup2?: string;
  authorizedPickup2Phone?: string;
  authorizedPickup3?: string;
  authorizedPickup3Phone?: string;
  allergies: string;
  medicalNotes: string;
  status: "active" | "inactive";
  parentUserId?: string;
  recurringCharges?: RecurringCharge[];
  classroomId?: string;
}

export interface AttendanceRecord {
  id: string;
  childId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status?: "present" | "absent";
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  childId: string;
  amount: number;
  dueDate: string;
  createdAt: string;
  paidDate?: string;
  status: "pending" | "paid" | "overdue";
  description: string;
}

export interface MealMenu {
  id: string;
  day: string;
  mealType: string;
  menuName: string;
  description: string;
  allergens: string;
}

export interface OperatingHours {
  [day: string]: { open: string; close: string; closed: boolean };
}

export interface CompanyInfo {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  website: string;
  taxId: string;
  logo?: string;
  operatingHours: OperatingHours;
}

export interface ActivityPhoto {
  id: string;
  childId: string;
  date: string;
  photo: string;
  caption?: string;
  uploadedAt: string;
}

export interface DailyActivity {
  id: string;
  childId: string;
  date: string;
  bathroomTimes: string[];
  napStart?: string;
  napEnd?: string;
  mood: "happy" | "sad" | "cranky" | "energetic" | "calm" | "";
  teacherNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Classroom {
  id: string;
  name: string;
  ageGroup: string;
  capacity: number;
  teacherName: string;
  description: string;
  status: "active" | "inactive";
  createdAt: string;
}

// Context Type Definition
interface DataContextType {
  children: Child[];
  attendance: AttendanceRecord[];
  invoices: Invoice[];
  mealMenus: MealMenu[];
  activityPhotos: ActivityPhoto[];
  dailyActivities: DailyActivity[];
  classrooms: Classroom[];
  companyInfo: CompanyInfo;
  isLoading: boolean;
  addChild: (child: Omit<Child, "id">) => Promise<void>;
  updateChild: (id: string, child: Partial<Child>) => Promise<void>;
  deleteChild: (id: string) => Promise<void>;
  checkIn: (childId: string, date: string, time: string) => Promise<void>;
  checkOut: (attendanceId: string, time: string) => Promise<void>;
  markAbsent: (childId: string, date: string) => Promise<void>;
  addInvoice: (invoice: Omit<Invoice, "id" | "invoiceNumber" | "status" | "createdAt">) => Promise<void>;
  updateInvoice: (id: string, invoice: Partial<Invoice>) => Promise<void>;
  addMealMenu: (menu: Omit<MealMenu, "id">) => Promise<void>;
  updateMealMenu: (id: string, menu: Partial<MealMenu>) => Promise<void>;
  deleteMealMenu: (id: string) => Promise<void>;
  updateCompanyInfo: (info: Partial<CompanyInfo>) => Promise<void>;
  addActivityPhoto: (photo: Omit<ActivityPhoto, "id" | "uploadedAt">) => Promise<void>;
  deleteActivityPhoto: (id: string) => Promise<void>;
  getActivityPhotos: (childId: string, date: string) => ActivityPhoto[];
  addDailyActivity: (activity: Omit<DailyActivity, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateDailyActivity: (id: string, activity: Partial<DailyActivity>) => Promise<void>;
  getDailyActivity: (childId: string, date: string) => DailyActivity | undefined;
  addClassroom: (classroom: Omit<Classroom, "id" | "createdAt">) => Promise<void>;
  updateClassroom: (id: string, classroom: Partial<Classroom>) => Promise<void>;
  deleteClassroom: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

// Create Context
const DataContext = createContext<DataContextType | undefined>(undefined);

// Custom Hook to use DataContext
export function useData(): DataContextType {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}

// Helper to normalize date strings (strip time portion from ISO timestamps)
const normalizeDate = (dateStr: string | null): string => {
  if (!dateStr) return '';
  // Handle ISO timestamp format (e.g., "2020-01-01T00:00:00.000Z")
  return dateStr.split('T')[0];
};

// Helper functions to convert between database and app formats
const dbToChild = (row: any): Child => ({
  id: row.id,
  firstName: row.first_name,
  lastName: row.last_name,
  dateOfBirth: normalizeDate(row.date_of_birth),
  photo: row.photo,
  parentName: row.parent_name,
  parentEmail: row.parent_email,
  parentPhone: row.parent_phone,
  emergencyContact: row.emergency_contact,
  emergencyPhone: row.emergency_phone,
  emergencyContact2: row.emergency_contact_2,
  emergencyPhone2: row.emergency_phone_2,
  authorizedPickup1: row.authorized_pickup_1,
  authorizedPickup1Phone: row.authorized_pickup_1_phone,
  authorizedPickup2: row.authorized_pickup_2,
  authorizedPickup2Phone: row.authorized_pickup_2_phone,
  authorizedPickup3: row.authorized_pickup_3,
  authorizedPickup3Phone: row.authorized_pickup_3_phone,
  allergies: row.allergies || "",
  medicalNotes: row.medical_notes || "",
  status: row.status,
  parentUserId: row.parent_user_id,
  recurringCharges: row.recurring_charges || [],
  classroomId: row.classroom_id,
});

const childToDb = (child: Omit<Child, "id">, daycareId?: string | null) => ({
  first_name: child.firstName,
  last_name: child.lastName,
  date_of_birth: child.dateOfBirth,
  photo: child.photo,
  parent_name: child.parentName,
  parent_email: child.parentEmail,
  parent_phone: child.parentPhone,
  emergency_contact: child.emergencyContact,
  emergency_phone: child.emergencyPhone,
  emergency_contact_2: child.emergencyContact2,
  emergency_phone_2: child.emergencyPhone2,
  authorized_pickup_1: child.authorizedPickup1,
  authorized_pickup_1_phone: child.authorizedPickup1Phone,
  authorized_pickup_2: child.authorizedPickup2,
  authorized_pickup_2_phone: child.authorizedPickup2Phone,
  authorized_pickup_3: child.authorizedPickup3,
  authorized_pickup_3_phone: child.authorizedPickup3Phone,
  allergies: child.allergies,
  medical_notes: child.medicalNotes,
  status: child.status,
  parent_user_id: child.parentUserId,
  recurring_charges: child.recurringCharges || [],
  classroom_id: child.classroomId,
  daycare_id: daycareId,
});

const dbToAttendance = (row: any): AttendanceRecord => ({
  id: row.id,
  childId: row.child_id,
  date: normalizeDate(row.date),
  checkIn: row.check_in,
  checkOut: row.check_out,
  status: row.status,
});

const dbToInvoice = (row: any): Invoice => ({
  id: row.id,
  invoiceNumber: row.invoice_number,
  childId: row.child_id,
  amount: parseFloat(row.amount),
  dueDate: normalizeDate(row.due_date),
  createdAt: row.created_at,
  paidDate: row.paid_date ? normalizeDate(row.paid_date) : undefined,
  status: row.status,
  description: row.description || "",
});

const dbToMealMenu = (row: any): MealMenu => ({
  id: row.id,
  day: row.day,
  mealType: row.meal_type,
  menuName: row.menu_name,
  description: row.description || "",
  allergens: row.allergens || "",
});

const dbToActivityPhoto = (row: any): ActivityPhoto => ({
  id: row.id,
  childId: row.child_id,
  date: normalizeDate(row.date),
  photo: row.photo,
  caption: row.caption,
  uploadedAt: row.uploaded_at,
});

const dbToDailyActivity = (row: any): DailyActivity => ({
  id: row.id,
  childId: row.child_id,
  date: normalizeDate(row.date),
  bathroomTimes: row.bathroom_times || [],
  napStart: row.nap_start,
  napEnd: row.nap_end,
  mood: row.mood || "",
  teacherNotes: row.teacher_notes || "",
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const dbToClassroom = (row: any): Classroom => ({
  id: row.id,
  name: row.name,
  ageGroup: row.age_group || "",
  capacity: row.capacity || 0,
  teacherName: row.teacher_name || "",
  description: row.description || "",
  status: row.status,
  createdAt: row.created_at,
});

const defaultOperatingHours: OperatingHours = {
  Monday: { open: "07:00", close: "18:00", closed: false },
  Tuesday: { open: "07:00", close: "18:00", closed: false },
  Wednesday: { open: "07:00", close: "18:00", closed: false },
  Thursday: { open: "07:00", close: "18:00", closed: false },
  Friday: { open: "07:00", close: "18:00", closed: false },
  Saturday: { open: "08:00", close: "13:00", closed: true },
  Sunday: { open: "08:00", close: "13:00", closed: true },
};

const dbToCompanyInfo = (row: any): CompanyInfo => ({
  name: row.name || "",
  address: row.address || "",
  city: row.city || "",
  state: row.state || "",
  zipCode: row.zip_code || "",
  phone: row.phone || "",
  email: row.email || "",
  website: row.website || "",
  taxId: row.tax_id || "",
  logo: row.logo || "",
  operatingHours: row.operating_hours ? (typeof row.operating_hours === "string" ? JSON.parse(row.operating_hours) : row.operating_hours) : defaultOperatingHours,
});

// Provider Component
export function DataProvider({ children: reactChildren }: { children: ReactNode }) {
  const { currentDaycare, isSuperAdmin, currentUser } = useAuth();
  const [childrenData, setChildrenData] = useState<Child[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [mealMenus, setMealMenus] = useState<MealMenu[]>([]);
  const [activityPhotos, setActivityPhotos] = useState<ActivityPhoto[]>([]);
  const [dailyActivities, setDailyActivities] = useState<DailyActivity[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    phone: "",
    email: "",
    website: "",
    taxId: "",
    logo: "",
    operatingHours: defaultOperatingHours,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Get the daycare ID to filter by
  const getDaycareId = () => {
    // Super admin viewing all daycares - no filter
    if (isSuperAdmin && !currentDaycare) return null;
    // Super admin managing a specific daycare
    if (currentDaycare) return currentDaycare.id;
    // Regular user - use their assigned daycare
    return currentUser?.daycareId || null;
  };

  // Fetch all data from Supabase
  const fetchAllData = async (explicitDaycareId?: string | null) => {
    setIsLoading(true);
    // Use explicit daycare ID if provided, otherwise calculate it
    const daycareId = explicitDaycareId !== undefined ? explicitDaycareId : getDaycareId();
    console.log("Fetching data for daycare ID:", daycareId);

    try {
      // Helper function to filter data by daycare_id on client side
      // (API doesn't support daycare_id query parameter filtering)
      const filterByDaycare = (rows: any[] | null, daycareId: string | null) => {
        if (!rows) return [];
        if (!daycareId) return rows; // No filter needed
        return rows.filter((row: any) => row.daycare_id === daycareId);
      };

      // Fetch children - fetch all and filter client-side
      const { data: childrenRows } = await supabase.from("children").select("*");
      const filteredChildren = filterByDaycare(childrenRows, daycareId);
      setChildrenData(filteredChildren.map(dbToChild));

      // Fetch attendance - fetch all and filter client-side
      const { data: attendanceRows } = await supabase.from("attendance").select("*");
      const filteredAttendance = filterByDaycare(attendanceRows, daycareId);
      setAttendance(filteredAttendance.map(dbToAttendance));

      // Fetch invoices - fetch all and filter client-side
      const { data: invoiceRows } = await supabase.from("invoices").select("*");
      const filteredInvoices = filterByDaycare(invoiceRows, daycareId);
      setInvoices(filteredInvoices.map(dbToInvoice));

      // Fetch meal menus - fetch all and filter client-side
      const { data: mealMenuRows } = await supabase.from("meal_menus").select("*");
      const filteredMealMenus = filterByDaycare(mealMenuRows, daycareId);
      setMealMenus(filteredMealMenus.map(dbToMealMenu));

      // Fetch activity photos - fetch all and filter client-side
      const { data: photoRows } = await supabase.from("activity_photos").select("*");
      const filteredPhotos = filterByDaycare(photoRows, daycareId);
      setActivityPhotos(filteredPhotos.map(row => dbToActivityPhoto(row)));

      // Fetch daily activities - fetch all and filter client-side
      const { data: activityRows } = await supabase.from("daily_activities").select("*");
      const filteredActivities = filterByDaycare(activityRows, daycareId);
      setDailyActivities(filteredActivities.map(dbToDailyActivity));

      // Fetch classrooms - fetch all and filter client-side
      const { data: classroomRows } = await supabase.from("classrooms").select("*");
      const filteredClassrooms = filterByDaycare(classroomRows, daycareId);
      setClassrooms(filteredClassrooms.map(dbToClassroom));

      // Fetch company info - fetch all and filter client-side since API doesn't support daycare_id filter
      const { data: companyRows, error: companyError } = await supabase.from("company_info").select("*");
      console.log("Company info query result:", { daycareId, companyRows, companyError });
      if (companyRows && companyRows.length > 0) {
        // Filter by daycare_id on the client side
        const matchingCompanyInfo = daycareId
          ? companyRows.find((row: any) => row.daycare_id === daycareId)
          : companyRows[0];

        if (matchingCompanyInfo) {
          console.log("Setting company info to:", matchingCompanyInfo.name, "for daycare_id:", daycareId);
          setCompanyInfo(dbToCompanyInfo(matchingCompanyInfo));
        } else {
          // No matching company info for this daycare, reset to empty
          console.log("No company info found for daycare_id:", daycareId, ", resetting to empty");
          setCompanyInfo({
            name: "",
            address: "",
            city: "",
            state: "",
            zipCode: "",
            phone: "",
            email: "",
            website: "",
            taxId: "",
            logo: "",
            operatingHours: defaultOperatingHours,
          });
        }
      } else {
        // No company info records at all, reset to empty
        console.log("No company info found, resetting to empty");
        setCompanyInfo({
          name: "",
          address: "",
          city: "",
          state: "",
          zipCode: "",
          phone: "",
          email: "",
          website: "",
          taxId: "",
          logo: "",
          operatingHours: defaultOperatingHours,
        });
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on mount and when daycare changes
  useEffect(() => {
    // Only fetch data if user is authenticated
    if (currentUser) {
      // Calculate the daycare ID to use
      let daycareIdToFetch: string | null = null;
      if (isSuperAdmin && !currentDaycare) {
        daycareIdToFetch = null; // Super admin viewing all
      } else if (currentDaycare) {
        daycareIdToFetch = currentDaycare.id; // Use selected daycare
      } else {
        daycareIdToFetch = currentUser.daycareId || null; // Use user's assigned daycare
      }
      console.log("Daycare changed, fetching data for:", daycareIdToFetch, "Current daycare:", currentDaycare?.name);
      fetchAllData(daycareIdToFetch);
    }
  }, [currentDaycare?.id, currentUser?.id, isSuperAdmin]);

  // Child Management Functions
  const addChild = async (child: Omit<Child, "id">) => {
    const daycareId = getDaycareId();
    const { data, error } = await supabase
      .from("children")
      .insert([childToDb(child, daycareId)])
      .select()
      .single();

    if (error) {
      console.error("Error adding child:", error);
      throw error;
    }

    if (data) {
      setChildrenData(prev => [...prev, dbToChild(data)]);
    }
  };

  const updateChild = async (id: string, updates: Partial<Child>) => {
    const dbUpdates: any = {};
    if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName;
    if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName;
    if (updates.dateOfBirth !== undefined) dbUpdates.date_of_birth = updates.dateOfBirth;
    if (updates.photo !== undefined) dbUpdates.photo = updates.photo;
    if (updates.parentName !== undefined) dbUpdates.parent_name = updates.parentName;
    if (updates.parentEmail !== undefined) dbUpdates.parent_email = updates.parentEmail;
    if (updates.parentPhone !== undefined) dbUpdates.parent_phone = updates.parentPhone;
    if (updates.emergencyContact !== undefined) dbUpdates.emergency_contact = updates.emergencyContact;
    if (updates.emergencyPhone !== undefined) dbUpdates.emergency_phone = updates.emergencyPhone;
    if (updates.emergencyContact2 !== undefined) dbUpdates.emergency_contact_2 = updates.emergencyContact2;
    if (updates.emergencyPhone2 !== undefined) dbUpdates.emergency_phone_2 = updates.emergencyPhone2;
    if (updates.authorizedPickup1 !== undefined) dbUpdates.authorized_pickup_1 = updates.authorizedPickup1;
    if (updates.authorizedPickup1Phone !== undefined) dbUpdates.authorized_pickup_1_phone = updates.authorizedPickup1Phone;
    if (updates.authorizedPickup2 !== undefined) dbUpdates.authorized_pickup_2 = updates.authorizedPickup2;
    if (updates.authorizedPickup2Phone !== undefined) dbUpdates.authorized_pickup_2_phone = updates.authorizedPickup2Phone;
    if (updates.authorizedPickup3 !== undefined) dbUpdates.authorized_pickup_3 = updates.authorizedPickup3;
    if (updates.authorizedPickup3Phone !== undefined) dbUpdates.authorized_pickup_3_phone = updates.authorizedPickup3Phone;
    if (updates.allergies !== undefined) dbUpdates.allergies = updates.allergies;
    if (updates.medicalNotes !== undefined) dbUpdates.medical_notes = updates.medicalNotes;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.parentUserId !== undefined) dbUpdates.parent_user_id = updates.parentUserId;
    if (updates.recurringCharges !== undefined) dbUpdates.recurring_charges = updates.recurringCharges;
    if (updates.classroomId !== undefined) dbUpdates.classroom_id = updates.classroomId;
    dbUpdates.updated_at = new Date().toISOString();

    const { error } = await supabase.from("children").update(dbUpdates).eq("id", id);

    if (error) {
      console.error("Error updating child:", error);
      throw error;
    }

    setChildrenData(prev => prev.map(child =>
      child.id === id ? { ...child, ...updates } : child
    ));
  };

  const deleteChild = async (id: string) => {
    const { error } = await supabase.from("children").delete().eq("id", id);

    if (error) {
      console.error("Error deleting child:", error);
      throw error;
    }

    setChildrenData(prev => prev.filter(child => child.id !== id));
  };

  // Attendance Management Functions
  const checkIn = async (childId: string, date: string, time: string) => {
    const daycareId = getDaycareId();
    const { data, error } = await supabase
      .from("attendance")
      .insert([{
        child_id: childId,
        date,
        check_in: time,
        status: "present",
        daycare_id: daycareId,
      }])
      .select()
      .single();

    if (error) {
      console.error("Error checking in:", error);
      throw error;
    }

    if (data) {
      setAttendance(prev => [...prev, dbToAttendance(data)]);
    }
  };

  const checkOut = async (attendanceId: string, time: string) => {
    const { error } = await supabase
      .from("attendance")
      .update({ check_out: time })
      .eq("id", attendanceId);

    if (error) {
      console.error("Error checking out:", error);
      throw error;
    }

    setAttendance(prev => prev.map(att =>
      att.id === attendanceId ? { ...att, checkOut: time } : att
    ));
  };

  const markAbsent = async (childId: string, date: string) => {
    const daycareId = getDaycareId();
    const { data, error } = await supabase
      .from("attendance")
      .insert([{
        child_id: childId,
        date,
        status: "absent",
        daycare_id: daycareId,
      }])
      .select()
      .single();

    if (error) {
      console.error("Error marking absent:", error);
      throw error;
    }

    if (data) {
      setAttendance(prev => [...prev, dbToAttendance(data)]);
    }
  };

  // Invoice Management Functions
  const addInvoice = async (invoice: Omit<Invoice, "id" | "invoiceNumber" | "status" | "createdAt">) => {
    const daycareId = getDaycareId();
    const invoiceNumber = `INV-${Date.now()}`;
    const { data, error } = await supabase
      .from("invoices")
      .insert([{
        invoice_number: invoiceNumber,
        child_id: invoice.childId,
        amount: invoice.amount,
        due_date: invoice.dueDate,
        description: invoice.description,
        status: "pending",
        daycare_id: daycareId,
      }])
      .select()
      .single();

    if (error) {
      console.error("Error adding invoice:", error);
      throw error;
    }

    if (data) {
      setInvoices(prev => [...prev, dbToInvoice(data)]);
    }
  };

  const updateInvoice = async (id: string, updates: Partial<Invoice>) => {
    const dbUpdates: any = {};
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
    if (updates.paidDate !== undefined) dbUpdates.paid_date = updates.paidDate;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.description !== undefined) dbUpdates.description = updates.description;

    const { error } = await supabase.from("invoices").update(dbUpdates).eq("id", id);

    if (error) {
      console.error("Error updating invoice:", error);
      throw error;
    }

    setInvoices(prev => prev.map(invoice =>
      invoice.id === id ? { ...invoice, ...updates } : invoice
    ));
  };

  // Meal Menu Management Functions
  const addMealMenu = async (menu: Omit<MealMenu, "id">) => {
    const daycareId = getDaycareId();
    const { data, error } = await supabase
      .from("meal_menus")
      .insert([{
        day: menu.day,
        meal_type: menu.mealType,
        menu_name: menu.menuName,
        description: menu.description,
        allergens: menu.allergens,
        daycare_id: daycareId,
      }])
      .select()
      .single();

    if (error) {
      console.error("Error adding meal menu:", error);
      throw error;
    }

    if (data) {
      setMealMenus(prev => [...prev, dbToMealMenu(data)]);
    }
  };

  const updateMealMenu = async (id: string, updates: Partial<MealMenu>) => {
    const dbUpdates: any = {};
    if (updates.day !== undefined) dbUpdates.day = updates.day;
    if (updates.mealType !== undefined) dbUpdates.meal_type = updates.mealType;
    if (updates.menuName !== undefined) dbUpdates.menu_name = updates.menuName;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.allergens !== undefined) dbUpdates.allergens = updates.allergens;

    const { error } = await supabase.from("meal_menus").update(dbUpdates).eq("id", id);

    if (error) {
      console.error("Error updating meal menu:", error);
      throw error;
    }

    setMealMenus(prev => prev.map(menu =>
      menu.id === id ? { ...menu, ...updates } : menu
    ));
  };

  const deleteMealMenu = async (id: string) => {
    const { error } = await supabase.from("meal_menus").delete().eq("id", id);

    if (error) {
      console.error("Error deleting meal menu:", error);
      throw error;
    }

    setMealMenus(prev => prev.filter(menu => menu.id !== id));
  };

  // Company Info Management Function
  const updateCompanyInfo = async (info: Partial<CompanyInfo>) => {
    const daycareId = getDaycareId();

    // Don't allow updating company info without a daycare context
    if (!daycareId) {
      console.error("Cannot update company info without a daycare context");
      return;
    }

    const dbUpdates: any = {};
    if (info.name !== undefined) dbUpdates.name = info.name;
    if (info.address !== undefined) dbUpdates.address = info.address;
    if (info.city !== undefined) dbUpdates.city = info.city;
    if (info.state !== undefined) dbUpdates.state = info.state;
    if (info.zipCode !== undefined) dbUpdates.zip_code = info.zipCode;
    if (info.phone !== undefined) dbUpdates.phone = info.phone;
    if (info.email !== undefined) dbUpdates.email = info.email;
    if (info.website !== undefined) dbUpdates.website = info.website;
    if (info.taxId !== undefined) dbUpdates.tax_id = info.taxId;
    if (info.logo !== undefined) dbUpdates.logo = info.logo;
    if (info.operatingHours !== undefined) dbUpdates.operating_hours = info.operatingHours;
    dbUpdates.updated_at = new Date().toISOString();

    // Fetch all company_info rows and find matching one client-side
    // (API client only supports filtering by id)
    const { data: allRows } = await supabase.from("company_info").select("*");
    const existingRow = allRows?.find((row: any) => row.daycare_id === daycareId);

    const saveToDb = async (updates: any) => {
      if (existingRow) {
        // Use .eq("id", ...) which the API client supports
        const { error } = await supabase.from("company_info").update(updates).eq("id", existingRow.id);
        return error;
      } else {
        updates.daycare_id = daycareId;
        const { error } = await supabase.from("company_info").insert([updates]);
        return error;
      }
    };

    // Try saving all fields first
    let error = await saveToDb({ ...dbUpdates });

    if (error) {
      console.warn("Full save failed, retrying without operating_hours:", error.message);
      // Retry without operating_hours in case the column doesn't exist yet
      const { operating_hours, ...fallbackUpdates } = dbUpdates;
      error = await saveToDb({ ...fallbackUpdates });

      if (error) {
        console.error("Error saving company info:", error);
        throw error;
      }
    }

    setCompanyInfo(prev => ({ ...prev, ...info }));
  };

  // Activity Photo Management Functions
  const addActivityPhoto = async (photo: Omit<ActivityPhoto, "id" | "uploadedAt">) => {
    const daycareId = getDaycareId();
    const { data, error } = await supabase
      .from("activity_photos")
      .insert([{
        child_id: photo.childId,
        date: photo.date,
        photo: photo.photo,
        caption: photo.caption,
        daycare_id: daycareId,
      }])
      .select()
      .single();

    if (error) {
      console.error("Error adding activity photo:", error);
      throw error;
    }

    setActivityPhotos(prev => [...prev, {
      id: (data as any)?.id,
      childId: photo.childId,
      date: photo.date,
      photo: photo.photo,
      caption: photo.caption || '',
      uploadedAt: (data as any)?.uploaded_at || new Date().toISOString(),
    }]);
  };

  const deleteActivityPhoto = async (id: string) => {
    const { error } = await supabase.from("activity_photos").delete().eq("id", id);

    if (error) {
      console.error("Error deleting activity photo:", error);
      throw error;
    }

    setActivityPhotos(prev => prev.filter(photo => photo.id !== id));
  };

  const getActivityPhotos = (childId: string, date: string) => {
    return activityPhotos.filter(photo => photo.childId === childId && photo.date === date);
  };

  // Daily Activity Management Functions
  const addDailyActivity = async (activity: Omit<DailyActivity, "id" | "createdAt" | "updatedAt">) => {
    const daycareId = getDaycareId();
    const { data, error } = await supabase
      .from("daily_activities")
      .insert([{
        child_id: activity.childId,
        date: activity.date,
        bathroom_times: activity.bathroomTimes,
        nap_start: activity.napStart,
        nap_end: activity.napEnd,
        mood: activity.mood,
        teacher_notes: activity.teacherNotes,
        daycare_id: daycareId,
      }])
      .select()
      .single();

    if (error) {
      console.error("Error adding daily activity:", error);
      throw error;
    }

    if (data) {
      setDailyActivities(prev => [...prev, dbToDailyActivity(data)]);
    }
  };

  const updateDailyActivity = async (id: string, updates: Partial<DailyActivity>) => {
    const dbUpdates: any = {};
    if (updates.bathroomTimes !== undefined) dbUpdates.bathroom_times = updates.bathroomTimes;
    if (updates.napStart !== undefined) dbUpdates.nap_start = updates.napStart;
    if (updates.napEnd !== undefined) dbUpdates.nap_end = updates.napEnd;
    if (updates.mood !== undefined) dbUpdates.mood = updates.mood;
    if (updates.teacherNotes !== undefined) dbUpdates.teacher_notes = updates.teacherNotes;
    dbUpdates.updated_at = new Date().toISOString();

    const { error } = await supabase.from("daily_activities").update(dbUpdates).eq("id", id);

    if (error) {
      console.error("Error updating daily activity:", error);
      throw error;
    }

    setDailyActivities(prev => prev.map(activity =>
      activity.id === id ? { ...activity, ...updates, updatedAt: new Date().toISOString() } : activity
    ));
  };

  const getDailyActivity = (childId: string, date: string) => {
    return dailyActivities.find(activity => activity.childId === childId && activity.date === date);
  };

  // Classroom Management Functions
  const addClassroom = async (classroom: Omit<Classroom, "id" | "createdAt">) => {
    const daycareId = getDaycareId();
    const { data, error } = await supabase
      .from("classrooms")
      .insert([{
        name: classroom.name,
        age_group: classroom.ageGroup,
        capacity: classroom.capacity,
        teacher_name: classroom.teacherName,
        description: classroom.description,
        status: classroom.status,
        daycare_id: daycareId,
      }])
      .select()
      .single();

    if (error) {
      console.error("Error adding classroom:", error);
      throw error;
    }

    if (data) {
      setClassrooms(prev => [...prev, dbToClassroom(data)]);
    }
  };

  const updateClassroom = async (id: string, updates: Partial<Classroom>) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.ageGroup !== undefined) dbUpdates.age_group = updates.ageGroup;
    if (updates.capacity !== undefined) dbUpdates.capacity = updates.capacity;
    if (updates.teacherName !== undefined) dbUpdates.teacher_name = updates.teacherName;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.status !== undefined) dbUpdates.status = updates.status;

    const { error } = await supabase.from("classrooms").update(dbUpdates).eq("id", id);

    if (error) {
      console.error("Error updating classroom:", error);
      throw error;
    }

    setClassrooms(prev => prev.map(classroom =>
      classroom.id === id ? { ...classroom, ...updates } : classroom
    ));
  };

  const deleteClassroom = async (id: string) => {
    const { error } = await supabase.from("classrooms").delete().eq("id", id);

    if (error) {
      console.error("Error deleting classroom:", error);
      throw error;
    }

    setClassrooms(prev => prev.filter(classroom => classroom.id !== id));
  };

  return (
    <DataContext.Provider
      value={{
        children: childrenData,
        attendance,
        invoices,
        mealMenus,
        activityPhotos,
        dailyActivities,
        classrooms,
        companyInfo,
        isLoading,
        addChild,
        updateChild,
        deleteChild,
        checkIn,
        checkOut,
        markAbsent,
        addInvoice,
        updateInvoice,
        addMealMenu,
        updateMealMenu,
        deleteMealMenu,
        updateCompanyInfo,
        addActivityPhoto,
        deleteActivityPhoto,
        getActivityPhotos,
        addDailyActivity,
        updateDailyActivity,
        getDailyActivity,
        addClassroom,
        updateClassroom,
        deleteClassroom,
        refreshData: fetchAllData,
      }}
    >
      {reactChildren}
    </DataContext.Provider>
  );
}
