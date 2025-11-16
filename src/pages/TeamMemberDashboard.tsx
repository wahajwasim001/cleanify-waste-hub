import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Leaf, LogOut, MapPin, Camera, CheckCircle, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera as CapCamera, CameraResultType, CameraSource } from "@capacitor/camera";
import WasteMap from "@/components/WasteMap";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TeamMemberDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [earnings, setEarnings] = useState(0);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }

    setUser(user);

    // Verify team member role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", user.id)
      .eq("role", "team_member")
      .maybeSingle();

    if (!roleData) {
      toast.error("Access denied - Team Member role required");
      navigate("/dashboard");
      return;
    }

    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    setProfile(profile);
    setEarnings(profile?.wallet_balance || 0);

    // Get tasks assigned to this team member
    const { data: tasksData } = await supabase
      .from("waste_requests")
      .select("*")
      .eq("assigned_team_id", user.id)
      .order("created_at", { ascending: false });

    // Fetch citizen profiles
    const citizenIds = [...new Set(tasksData?.map(t => t.citizen_id) || [])];
    const { data: citizenProfiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", citizenIds);

    const profileMap = Object.fromEntries(
      (citizenProfiles || []).map(p => [p.id, p])
    );

    const enrichedTasks = (tasksData || []).map(task => ({
      ...task,
      citizen_name: profileMap[task.citizen_id]?.full_name || "Unknown"
    }));

    setMyTasks(enrichedTasks);
  };

  const captureBeforePhoto = async (taskId: string) => {
    try {
      const image = await CapCamera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
      });

      if (!image.base64String) throw new Error("No photo captured");

      const base64Data = image.base64String;
      const fileName = `before_${taskId}_${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("waste-photos")
        .upload(fileName, decode(base64Data), { contentType: "image/jpeg" });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("waste-photos")
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("waste_requests")
        .update({ before_photo_url: publicUrl })
        .eq("id", taskId);

      if (updateError) throw updateError;

      toast.success("Before photo uploaded!");
      checkUser();
    } catch (error: any) {
      toast.error(error.message || "Failed to upload photo");
    }
  };

  const captureAfterPhoto = async (taskId: string) => {
    try {
      const image = await CapCamera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
      });

      if (!image.base64String) throw new Error("No photo captured");

      const base64Data = image.base64String;
      const fileName = `after_${taskId}_${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("waste-photos")
        .upload(fileName, decode(base64Data), { contentType: "image/jpeg" });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("waste-photos")
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("waste_requests")
        .update({ after_photo_url: publicUrl })
        .eq("id", taskId);

      if (updateError) throw updateError;

      toast.success("After photo uploaded!");
      checkUser();
    } catch (error: any) {
      toast.error(error.message || "Failed to upload photo");
    }
  };

  const decode = (base64: string) => {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const markCompleted = async (taskId: string) => {
    const task = myTasks.find(t => t.id === taskId);
    if (!task?.before_photo_url || !task?.after_photo_url) {
      toast.error("Please upload both before and after photos first");
      return;
    }

    try {
      const { error } = await supabase
        .from("waste_requests")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", taskId);

      if (error) throw error;

      toast.success("Task marked as completed! Awaiting verification.");
      checkUser();
    } catch (error: any) {
      toast.error(error.message || "Failed to mark task as completed");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (!profile) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  const activeTasks = myTasks.filter(t => t.status !== "completed");
  const completedTasks = myTasks.filter(t => t.status === "completed");

  const mapLocations = myTasks
    .filter(t => t.latitude && t.longitude)
    .map(t => ({
      id: t.id,
      latitude: t.latitude,
      longitude: t.longitude,
      address: t.address,
      status: t.status,
      number_of_bags: t.number_of_bags,
    }));

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Leaf className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Cleanify</h1>
              <Badge variant="secondary" className="text-xs">Team Member</Badge>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome, {profile.full_name}</h2>
          <p className="text-muted-foreground">Complete your assigned tasks and earn rewards</p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Active Tasks</CardDescription>
              <CardTitle className="text-3xl">{activeTasks.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Completed</CardDescription>
              <CardTitle className="text-3xl">{completedTasks.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Wallet Balance</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-1">
                <DollarSign className="h-6 w-6" />
                {earnings} PKR
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Tabs defaultValue="active" className="space-y-6">
          <TabsList>
            <TabsTrigger value="active">Active Tasks</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="map">Map View</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {activeTasks.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No active tasks assigned
                </CardContent>
              </Card>
            ) : (
              activeTasks.map((task) => (
                <Card key={task.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg mb-1">{task.citizen_name}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {task.address}
                        </p>
                      </div>
                      <Badge>{task.status}</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                      <div>
                        <span className="text-muted-foreground">Bags:</span>
                        <span className="ml-2 font-medium">{task.number_of_bags}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Reward:</span>
                        <span className="ml-2 font-medium">{task.reward_pkr} PKR</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => captureBeforePhoto(task.id)}
                          disabled={!!task.before_photo_url}
                          className="flex-1"
                        >
                          <Camera className="h-4 w-4 mr-2" />
                          {task.before_photo_url ? "Before ✓" : "Before Photo"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => captureAfterPhoto(task.id)}
                          disabled={!!task.after_photo_url}
                          className="flex-1"
                        >
                          <Camera className="h-4 w-4 mr-2" />
                          {task.after_photo_url ? "After ✓" : "After Photo"}
                        </Button>
                      </div>

                      <Button
                        onClick={() => markCompleted(task.id)}
                        disabled={!task.before_photo_url || !task.after_photo_url}
                        className="w-full"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark Completed
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedTasks.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No completed tasks yet
                </CardContent>
              </Card>
            ) : (
              completedTasks.map((task) => (
                <Card key={task.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg mb-1">{task.citizen_name}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {task.address}
                        </p>
                      </div>
                      <Badge variant="default">Completed</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Bags:</span>
                        <span className="ml-2 font-medium">{task.number_of_bags}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status:</span>
                        <span className="ml-2 font-medium">{task.verification_status}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="map">
            <Card>
              <CardHeader>
                <CardTitle>Task Locations</CardTitle>
                <CardDescription>View your assigned waste collection locations</CardDescription>
              </CardHeader>
              <CardContent>
                <WasteMap locations={mapLocations} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TeamMemberDashboard;
