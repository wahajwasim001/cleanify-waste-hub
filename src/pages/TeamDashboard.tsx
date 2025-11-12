import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Leaf, LogOut, CheckCircle, Clock, DollarSign, Camera, Map } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera as CapCamera, CameraResultType, CameraSource } from "@capacitor/camera";
import WasteMap from "@/components/WasteMap";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TeamDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
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

    // Get profile with wallet balance
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    setProfile(profile);
    setEarnings(profile?.wallet_balance || 0);

    // Get assigned tasks
    const { data: tasksData } = await supabase
      .from("waste_requests")
      .select("*")
      .eq("assigned_team_id", user.id)
      .order("created_at", { ascending: false });

    // Fetch citizen profiles separately
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
      profiles: profileMap[task.citizen_id] || { full_name: "Unknown" }
    }));

    console.log("Team tasks:", enrichedTasks);
    console.log("Current user ID:", user.id);
    setTasks(enrichedTasks);
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

  const markCompleted = async (taskId: string, task: any) => {
    if (!task.before_photo_url || !task.after_photo_url) {
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

      toast.success("Task marked as complete! Awaiting admin verification for 500 PKR payment.");
      checkUser();
    } catch (error: any) {
      toast.error(error.message || "Failed to update task");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (!profile) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Leaf className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-primary">Cleanify</span>
              <Badge variant="secondary">Team</Badge>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Welcome, {profile.full_name}
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tasks.filter(t => t.status !== "completed").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{earnings} PKR</div>
            </CardContent>
          </Card>
        </div>

        {/* Task List with Map */}
        <Card>
          <CardHeader>
            <CardTitle>My Tasks</CardTitle>
            <CardDescription>Upload before/after photos and mark tasks complete (500 PKR per task)</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="list" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="list">Task List</TabsTrigger>
                <TabsTrigger value="map">
                  <Map className="h-4 w-4 mr-2" />
                  Map View
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="list">
            {tasks.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No tasks assigned yet</p>
            ) : (
              <div className="space-y-4">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex flex-col p-4 border border-border rounded-lg bg-muted/30 gap-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{task.profiles.full_name}</h3>
                        <Badge
                          variant={
                            task.status === "completed"
                              ? "default"
                              : task.status === "assigned"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {task.status}
                        </Badge>
                        {task.verification_status === "approved" && (
                          <Badge className="bg-green-600">✓ Paid</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {task.number_of_bags} bags • Payment: 500 PKR (Leader)
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Assigned: {new Date(task.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    
                    {task.status !== "completed" && (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={task.before_photo_url ? "default" : "outline"}
                            onClick={() => captureBeforePhoto(task.id)}
                            disabled={!!task.before_photo_url}
                            className="flex-1"
                          >
                            <Camera className="h-4 w-4 mr-2" />
                            {task.before_photo_url ? "✓ Before" : "Before Photo"}
                          </Button>
                          <Button
                            size="sm"
                            variant={task.after_photo_url ? "default" : "outline"}
                            onClick={() => captureAfterPhoto(task.id)}
                            disabled={!!task.after_photo_url}
                            className="flex-1"
                          >
                            <Camera className="h-4 w-4 mr-2" />
                            {task.after_photo_url ? "✓ After" : "After Photo"}
                          </Button>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => markCompleted(task.id, task)}
                          className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark Complete
                        </Button>
                      </div>
                    )}

                    {task.status === "completed" && task.verification_status === "pending" && (
                      <Badge variant="secondary">Awaiting Admin Verification</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
              </TabsContent>

              <TabsContent value="map">
                <WasteMap 
                  locations={tasks.map(task => ({
                    id: task.id,
                    latitude: task.latitude,
                    longitude: task.longitude,
                    address: task.address,
                    status: task.status,
                    number_of_bags: task.number_of_bags
                  }))} 
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeamDashboard;