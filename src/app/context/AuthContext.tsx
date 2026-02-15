import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "../../lib/api";
import { getTrialInfo, computeTrialEndDate, SubscriptionStatus } from "../../utils/trialUtils";

export interface User {
  id: string;
  username: string;
  password: string;
  role: "super_admin" | "admin" | "user" | "parent";
  fullName: string;
  email: string;
  createdAt: string;
  lastLogin?: string;
  status: "active" | "inactive";
  childIds?: string[];
  parentCode?: string;
  daycareId?: string;
}

export interface Daycare {
  id: string;
  name: string;
  daycareCode: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  email?: string;
  status: "active" | "inactive";
  createdAt: string;
  ownerUserId?: string;
  trialEndsAt?: string;
  subscriptionStatus?: SubscriptionStatus;
}

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  daycares: Daycare[];
  currentDaycare: Daycare | null;
  login: (username: string, password: string, daycareCode?: string) => Promise<{ success: boolean; daycareName?: string; trialExpired?: boolean }>;
  loginWithParentCode: (code: string) => Promise<boolean>;
  logout: () => void;
  addUser: (user: Omit<User, "id" | "createdAt">) => Promise<void>;
  updateUser: (id: string, user: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  addDaycare: (daycare: Omit<Daycare, "id" | "createdAt">) => Promise<Daycare>;
  updateDaycare: (id: string, daycare: Partial<Daycare>) => Promise<void>;
  deleteDaycare: (id: string) => Promise<void>;
  setCurrentDaycare: (daycare: Daycare | null) => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isLoading: boolean;
  logoutCount: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper functions to convert between database and app formats
const dbToUser = (row: any): User => ({
  id: row.id,
  username: row.username,
  password: row.password,
  role: row.role,
  fullName: row.full_name,
  email: row.email,
  createdAt: row.created_at,
  lastLogin: row.last_login,
  status: row.status,
  childIds: row.child_ids || [],
  parentCode: row.parent_code,
  daycareId: row.daycare_id,
});

const dbToDaycare = (row: any): Daycare => ({
  id: row.id,
  name: row.name,
  daycareCode: row.daycare_code,
  address: row.address,
  city: row.city,
  state: row.state,
  zipCode: row.zip_code,
  phone: row.phone,
  email: row.email,
  status: row.status,
  createdAt: row.created_at,
  ownerUserId: row.owner_user_id,
  trialEndsAt: row.trial_ends_at ?? undefined,
  subscriptionStatus: row.subscription_status ?? undefined,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("kidtracker_current_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [currentDaycare, setCurrentDaycareState] = useState<Daycare | null>(() => {
    const saved = localStorage.getItem("kidtracker_current_daycare");
    return saved ? JSON.parse(saved) : null;
  });

  const [users, setUsers] = useState<User[]>([]);
  const [daycares, setDaycares] = useState<Daycare[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [logoutCount, setLogoutCount] = useState(0);

  // Fetch users from Supabase
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("app_users")
        .select("*")
        .order("full_name");

      if (error) {
        console.error("Error fetching users:", error);
        return;
      }

      if (data) {
        setUsers(data.map(dbToUser));
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  // Fetch daycares from database
  const fetchDaycares = async () => {
    try {
      const { data, error } = await supabase
        .from("daycares")
        .select("*")
        .order("name");

      if (error) {
        console.error("Error fetching daycares:", error);
        return;
      }

      if (data) {
        setDaycares(data.map(dbToDaycare));
      }
    } catch (error) {
      console.error("Error fetching daycares:", error);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      await Promise.all([fetchUsers(), fetchDaycares()]);
      setIsLoading(false);
    };
    initializeData();
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("kidtracker_current_user", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("kidtracker_current_user");
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentDaycare) {
      localStorage.setItem("kidtracker_current_daycare", JSON.stringify(currentDaycare));
    } else {
      localStorage.removeItem("kidtracker_current_daycare");
    }
  }, [currentDaycare]);

  const setCurrentDaycare = (daycare: Daycare | null) => {
    setCurrentDaycareState(daycare);
  };

  const login = async (username: string, password: string, daycareCode?: string): Promise<{ success: boolean; daycareName?: string; trialExpired?: boolean }> => {
    try {
      // Trim whitespace from inputs
      const trimmedUsername = username.trim().toLowerCase();
      const trimmedPassword = password.trim();

      console.log("LOGIN: Attempting login with username:", trimmedUsername, "daycareCode:", daycareCode);

      // Fetch all users first
      const { data: allUsers, error: usersError } = await supabase
        .from("app_users")
        .select("*");

      console.log("LOGIN: Fetched users:", { count: allUsers?.length, error: usersError });

      if (usersError || !allUsers || allUsers.length === 0) {
        console.log("Login failed - no users found or error:", usersError);
        return { success: false };
      }

      // Check for super admin first (no daycare code needed)
      const superAdminUser = allUsers.find(
        (u: any) =>
          u.password === trimmedPassword &&
          u.status === "active" &&
          u.role === "super_admin" &&
          (u.username?.toLowerCase() === trimmedUsername || u.email?.toLowerCase() === trimmedUsername)
      );

      if (superAdminUser) {
        console.log("LOGIN: Found super admin user:", superAdminUser.username);
        const user = dbToUser(superAdminUser);
        const updatedUser = {
          ...user,
          lastLogin: new Date().toISOString()
        };

        await supabase
          .from("app_users")
          .update({ last_login: updatedUser.lastLogin })
          .eq("id", user.id);

        setCurrentUser(updatedUser);
        setCurrentDaycareState(null);
        setUsers(prev => prev.map(u => u.id === user.id ? updatedUser : u));
        return { success: true };
      }

      // For non-super-admin users, daycare code is required
      if (!daycareCode) {
        console.log("Login failed - daycare code required for non-super-admin users");
        return { success: false };
      }

      // Look up the daycare by code FIRST
      const { data: allDaycares, error: daycareError } = await supabase
        .from("daycares")
        .select("*");

      console.log("LOGIN: Fetched daycares:", { count: allDaycares?.length, error: daycareError });

      if (daycareError || !allDaycares || allDaycares.length === 0) {
        console.log("Login failed - could not fetch daycares");
        return { success: false };
      }

      // Find the target daycare by code
      const targetCode = daycareCode.trim().toUpperCase();
      const daycareData = allDaycares.find(
        (dc: any) => dc.daycare_code === targetCode && dc.status === "active"
      );

      if (!daycareData) {
        console.log("Login failed - invalid daycare code:", targetCode);
        console.log("LOGIN: Available daycare codes:", allDaycares.map((dc: any) => dc.daycare_code));
        return { success: false };
      }

      const daycare = dbToDaycare(daycareData);
      console.log("LOGIN: Found daycare:", daycare.name, "ID:", daycare.id);

      // Check trial status before allowing login
      const trialInfo = getTrialInfo(daycare);
      if (!trialInfo.isAccessAllowed) {
        console.log("LOGIN: Trial expired for daycare:", daycare.name);
        return { success: false, trialExpired: true, daycareName: daycare.name };
      }

      // Now find a user in THIS SPECIFIC DAYCARE matching the credentials
      const matchingUser = allUsers.find(
        (u: any) =>
          u.password === trimmedPassword &&
          u.status === "active" &&
          (u.daycare_id === daycare.id || !u.daycare_id) && // User must belong to this daycare or have no daycare assigned
          (u.username?.toLowerCase() === trimmedUsername || u.email?.toLowerCase() === trimmedUsername)
      );

      if (!matchingUser) {
        console.log("Login failed - no user found in daycare", daycare.name, "with username:", trimmedUsername);
        // Debug: show users in this daycare
        const daycareUsers = allUsers.filter((u: any) => u.daycare_id === daycare.id);
        console.log("LOGIN: Users in this daycare:", daycareUsers.map((u: any) => u.username));
        return { success: false };
      }

      console.log("LOGIN: Found matching user:", matchingUser.username, "in daycare:", daycare.name);

      const user = dbToUser(matchingUser);
      const updatedUser = {
        ...user,
        lastLogin: new Date().toISOString(),
        daycareId: daycare.id
      };

      // Update last login and daycare_id in database
      await supabase
        .from("app_users")
        .update({ last_login: updatedUser.lastLogin, daycare_id: daycare.id })
        .eq("id", user.id);

      console.log("LOGIN: Setting currentDaycare to:", daycare.name);
      setCurrentUser(updatedUser);
      setCurrentDaycareState(daycare);
      setUsers(prev => prev.map(u => u.id === user.id ? updatedUser : u));

      return { success: true, daycareName: daycare.name };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false };
    }
  };

  const loginWithParentCode = async (code: string): Promise<boolean> => {
    try {
      // Fetch all users and filter client-side since API doesn't support filtering
      const { data: allUsers, error } = await supabase
        .from("app_users")
        .select("*");

      if (error || !allUsers || allUsers.length === 0) {
        return false;
      }

      // Filter client-side by parent_code, status, and role
      const matchingUser = allUsers.find(
        (u: any) =>
          u.parent_code === code &&
          u.status === "active" &&
          u.role === "parent"
      );

      if (!matchingUser) {
        return false;
      }

      const user = dbToUser(matchingUser);
      const updatedUser = {
        ...user,
        lastLogin: new Date().toISOString()
      };

      // Update last login in database
      await supabase
        .from("app_users")
        .update({ last_login: updatedUser.lastLogin })
        .eq("id", user.id);

      // Set the current daycare based on user's daycareId
      if (user.daycareId) {
        const { data: allDaycares } = await supabase.from("daycares").select("*");
        if (allDaycares) {
          const userDaycare = allDaycares.find((dc: any) => dc.id === user.daycareId);
          if (userDaycare) {
            const daycare = dbToDaycare(userDaycare);
            // Check trial status before allowing parent login
            const trialInfo = getTrialInfo(daycare);
            if (!trialInfo.isAccessAllowed) {
              return false;
            }
            setCurrentDaycareState(daycare);
          }
        }
      }

      setCurrentUser(updatedUser);
      setUsers(prev => prev.map(u => u.id === user.id ? updatedUser : u));

      return true;
    } catch (error) {
      console.error("Parent code login error:", error);
      return false;
    }
  };

  const logout = () => {
    // Immediately clear localStorage to prevent stale data
    localStorage.removeItem("kidtracker_current_user");
    localStorage.removeItem("kidtracker_current_daycare");
    setCurrentUser(null);
    setCurrentDaycareState(null);
    setLogoutCount(prev => prev + 1);
  };

  const addUser = async (user: Omit<User, "id" | "createdAt">) => {
    try {
      // Determine which daycare this user should belong to
      // Use the daycareId from the user object if provided, otherwise use currentDaycare
      const daycareId = user.daycareId || currentDaycare?.id || null;

      const { data, error } = await supabase
        .from("app_users")
        .insert([{
          username: user.username,
          password: user.password,
          full_name: user.fullName,
          email: user.email,
          role: user.role,
          status: user.status,
          child_ids: user.childIds || [],
          parent_code: user.parentCode,
          daycare_id: daycareId,
        }])
        .select()
        .single();

      if (error) {
        console.error("Error adding user:", error);
        throw error;
      }

      if (data) {
        setUsers(prev => [...prev, dbToUser(data)]);
      }
    } catch (error) {
      console.error("Error adding user:", error);
      throw error;
    }
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    try {
      const dbUpdates: any = {};
      if (updates.username !== undefined) dbUpdates.username = updates.username;
      if (updates.password !== undefined) dbUpdates.password = updates.password;
      if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.role !== undefined) dbUpdates.role = updates.role;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.childIds !== undefined) dbUpdates.child_ids = updates.childIds;
      if (updates.parentCode !== undefined) dbUpdates.parent_code = updates.parentCode;
      if (updates.lastLogin !== undefined) dbUpdates.last_login = updates.lastLogin;

      const { error } = await supabase
        .from("app_users")
        .update(dbUpdates)
        .eq("id", id);

      if (error) {
        console.error("Error updating user:", error);
        throw error;
      }

      setUsers(prev => prev.map(user =>
        user.id === id ? { ...user, ...updates } : user
      ));

      // Update current user if it's the one being updated
      if (currentUser?.id === id) {
        setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
      }
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  };

  const deleteUser = async (id: string) => {
    try {
      const { error } = await supabase
        .from("app_users")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting user:", error);
        throw error;
      }

      setUsers(prev => prev.filter(user => user.id !== id));
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  };

  // Generate a unique 6-character daycare code
  const generateDaycareCode = (): string => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excluding similar chars like 0/O, 1/I
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const addDaycare = async (daycare: Omit<Daycare, "id" | "createdAt">): Promise<Daycare> => {
    try {
      // Generate a unique code if not provided
      const daycareCode = daycare.daycareCode || generateDaycareCode();

      const { data, error } = await supabase
        .from("daycares")
        .insert([{
          name: daycare.name,
          daycare_code: daycareCode.toUpperCase(),
          address: daycare.address,
          city: daycare.city,
          state: daycare.state,
          zip_code: daycare.zipCode,
          phone: daycare.phone,
          email: daycare.email,
          status: daycare.status || "active",
          owner_user_id: daycare.ownerUserId || currentUser?.id,
          trial_ends_at: computeTrialEndDate(),
          subscription_status: "trial",
        }])
        .select()
        .single();

      if (error) {
        console.error("Error adding daycare:", error);
        throw error;
      }

      if (data) {
        const newDaycare = dbToDaycare(data);

        // Create a default admin user for this daycare with unique username
        const defaultUsername = `admin_${daycareCode.toLowerCase()}`;
        const defaultPassword = "Password123!";

        const { data: newUserData, error: userError } = await supabase
          .from("app_users")
          .insert([{
            username: defaultUsername,
            password: defaultPassword,
            full_name: `${daycare.name} Admin`,
            email: daycare.email || `admin@${daycareCode.toLowerCase()}.daycare`,
            role: "admin",
            status: "active",
            daycare_id: newDaycare.id,
          }])
          .select()
          .single();

        if (userError) {
          console.error("Error creating default admin user:", userError);
          // Don't throw - daycare was created successfully, just log the error
        } else if (newUserData) {
          // Add the newly created user to the local state
          setUsers(prev => [...prev, dbToUser(newUserData)]);
          console.log(`Created default admin user for ${daycare.name}: username=${defaultUsername}, password=Password123!`);
        }

        // Create company_info record with daycare information
        const { error: companyError } = await supabase
          .from("company_info")
          .insert([{
            name: daycare.name,
            address: daycare.address || "",
            city: daycare.city || "",
            state: daycare.state || "",
            zip_code: daycare.zipCode || "",
            phone: daycare.phone || "",
            email: daycare.email || "",
            daycare_id: newDaycare.id,
          }]);

        if (companyError) {
          console.error("Error creating company info:", companyError);
          // Don't throw - daycare was created successfully, just log the error
        } else {
          console.log(`Created company info for ${daycare.name}`);
        }

        setDaycares(prev => [...prev, newDaycare]);
        return newDaycare;
      }

      throw new Error("No data returned from insert");
    } catch (error) {
      console.error("Error adding daycare:", error);
      throw error;
    }
  };

  const updateDaycare = async (id: string, updates: Partial<Daycare>) => {
    try {
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.daycareCode !== undefined) dbUpdates.daycare_code = updates.daycareCode.toUpperCase();
      if (updates.address !== undefined) dbUpdates.address = updates.address;
      if (updates.city !== undefined) dbUpdates.city = updates.city;
      if (updates.state !== undefined) dbUpdates.state = updates.state;
      if (updates.zipCode !== undefined) dbUpdates.zip_code = updates.zipCode;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.ownerUserId !== undefined) dbUpdates.owner_user_id = updates.ownerUserId;
      if (updates.trialEndsAt !== undefined) dbUpdates.trial_ends_at = updates.trialEndsAt;
      if (updates.subscriptionStatus !== undefined) dbUpdates.subscription_status = updates.subscriptionStatus;

      const { error } = await supabase
        .from("daycares")
        .update(dbUpdates)
        .eq("id", id);

      if (error) {
        console.error("Error updating daycare:", error);
        throw error;
      }

      // Also sync company_info record to keep data consistent
      // First fetch all company_info to find the one for this daycare (API doesn't support filtering)
      const { data: allCompanyInfo } = await supabase.from("company_info").select("*");
      const existingCompanyInfo = allCompanyInfo?.find((ci: any) => ci.daycare_id === id);

      const companyInfoUpdates: any = {
        updated_at: new Date().toISOString(),
      };
      if (updates.name !== undefined) companyInfoUpdates.name = updates.name;
      if (updates.address !== undefined) companyInfoUpdates.address = updates.address;
      if (updates.city !== undefined) companyInfoUpdates.city = updates.city;
      if (updates.state !== undefined) companyInfoUpdates.state = updates.state;
      if (updates.zipCode !== undefined) companyInfoUpdates.zip_code = updates.zipCode;
      if (updates.phone !== undefined) companyInfoUpdates.phone = updates.phone;
      if (updates.email !== undefined) companyInfoUpdates.email = updates.email;

      if (existingCompanyInfo) {
        // Update existing company_info by its id
        const { error: companyError } = await supabase
          .from("company_info")
          .update(companyInfoUpdates)
          .eq("id", existingCompanyInfo.id);

        if (companyError) {
          console.error("Error updating company info:", companyError);
        } else {
          console.log("Updated company info for daycare:", id);
        }
      } else {
        // Create new company_info record for this daycare
        companyInfoUpdates.daycare_id = id;
        // Get full daycare data to populate company_info
        const currentDaycareData = daycares.find(dc => dc.id === id);
        if (currentDaycareData) {
          companyInfoUpdates.name = updates.name ?? currentDaycareData.name;
          companyInfoUpdates.address = updates.address ?? currentDaycareData.address ?? "";
          companyInfoUpdates.city = updates.city ?? currentDaycareData.city ?? "";
          companyInfoUpdates.state = updates.state ?? currentDaycareData.state ?? "";
          companyInfoUpdates.zip_code = updates.zipCode ?? currentDaycareData.zipCode ?? "";
          companyInfoUpdates.phone = updates.phone ?? currentDaycareData.phone ?? "";
          companyInfoUpdates.email = updates.email ?? currentDaycareData.email ?? "";
        }

        const { error: createError } = await supabase
          .from("company_info")
          .insert([companyInfoUpdates]);

        if (createError) {
          console.error("Error creating company info:", createError);
        } else {
          console.log("Created company info for daycare:", id);
        }
      }

      setDaycares(prev => prev.map(dc =>
        dc.id === id ? { ...dc, ...updates } : dc
      ));

      // Update current daycare if it's the one being updated
      if (currentDaycare?.id === id) {
        setCurrentDaycareState(prev => prev ? { ...prev, ...updates } : null);
      }
    } catch (error) {
      console.error("Error updating daycare:", error);
      throw error;
    }
  };

  const deleteDaycare = async (id: string) => {
    try {
      // The API only supports delete by record id (not by foreign key),
      // so we must fetch each related table, find records for this daycare,
      // and delete them one by one.
      const relatedTables = [
        "activity_photos",
        "daily_activities",
        "meal_menus",
        "attendance",
        "invoices",
        "classrooms",
        "children",
        "company_info",
        "users",
      ];

      for (const table of relatedTables) {
        const { data: rows } = await supabase.from(table).select("*");
        if (rows) {
          const toDelete = rows.filter((r: any) => r.daycare_id === id);
          for (const row of toDelete) {
            await supabase.from(table).delete().eq("id", row.id);
          }
        }
      }

      // Now delete the daycare itself
      const { error } = await supabase
        .from("daycares")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting daycare:", error);
        throw error;
      }

      // Remove deleted users from local state
      setUsers(prev => prev.filter(u => u.daycareId !== id));
      setDaycares(prev => prev.filter(dc => dc.id !== id));

      // Clear current daycare if it's the one being deleted
      if (currentDaycare?.id === id) {
        setCurrentDaycareState(null);
      }
    } catch (error) {
      console.error("Error deleting daycare:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      users,
      daycares,
      currentDaycare,
      login,
      loginWithParentCode,
      logout,
      addUser,
      updateUser,
      deleteUser,
      addDaycare,
      updateDaycare,
      deleteDaycare,
      setCurrentDaycare,
      isAuthenticated: !!currentUser,
      isAdmin: currentUser?.role === "admin" || currentUser?.role === "super_admin",
      isSuperAdmin: currentUser?.role === "super_admin",
      isLoading,
      logoutCount,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
