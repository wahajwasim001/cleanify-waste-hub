import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Leaf, LogOut, MapPin, Users, CheckCircle, Clock, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import WasteMap from "@/components/WasteMap";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TeamLeaderDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [earnings, setEarnings] = useState(0);
  const [stats, setStats] = useState({
    activeTasks: 0,
    completedTasks: 0,
    teamSize: 0,
  });

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

    // Verify team leader role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", user.id)
      .eq("role", "team_leader")
      .maybeSingle();

    if (!roleData) {
      toast.error("Access denied - Team Leader role required");
      navigate("/dashboard");
      return;
    }

    // Get profile with wallet balance
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    setProfile(profile);
    setEarnings(profile?.wallet_balance || 0);

    // Get all tasks assigned to this team leader
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

    setAllTasks(enrichedTasks);

    // Get team members
    const { data: memberRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "team_member");

    if (memberRoles && memberRoles.length > 0) {
      const memberIds = memberRoles.map(r => r.user_id);
      const { data: members } = await supabase
        .from("profiles")
        .select("*")
        .in("id", memberIds);

      setTeamMembers(members || []);
    }

    // Calculate stats
    const activeTasks = tasksData?.filter(t => t.status !== "completed").length || 0;
    const completedTasks = tasksData?.filter(t => t.status === "completed").length || 0;

    setStats({
      activeTasks,
      completedTasks,
      teamSize: teamMembers.length,
    });
  };

  const assignTaskToMember = async (taskId: string, memberId: string) => {
    try {
      const { error } = await supabase
        .from("waste_requests")
        .update({ assigned_team_id: memberId, status: "assigned" })
        .eq("id", taskId);

      if (error) throw error;

      toast.success("Task assigned to team member");
      checkUser();
    } catch (error: any) {
      toast.error(error.message || "Failed to assign task");
    }
  };

  const approveTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from("waste_requests")
        .update({
          verification_status: "approved",
          verified_by: user.id,
          verified_at: new Date().toISOString(),
        })
        .eq("id", taskId);

      if (error) throw error;

      toast.success("Task approved and reward processed");
      checkUser();
    } catch (error: any) {
      toast.error(error.message || "Failed to approve task");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (!profile) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  const mapLocations = allTasks
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
              <Badge variant="secondary" className="text-xs">Team Leader</Badge>
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
          <p className="text-muted-foreground">Manage your team and oversee waste collection operations</p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Active Tasks</CardDescription>
              <CardTitle className="text-3xl">{stats.activeTasks}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Completed</CardDescription>
              <CardTitle className="text-3xl">{stats.completedTasks}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Team Size</CardDescription>
              <CardTitle className="text-3xl">{teamMembers.length}</CardTitle>
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

        <Tabs defaultValue="tasks" className="space-y-6">
          <TabsList>
            <TabsTrigger value="tasks">All Tasks</TabsTrigger>
            <TabsTrigger value="map">Map View</TabsTrigger>
            <TabsTrigger value="team">Team Members</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="space-y-4">
            {allTasks.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No tasks assigned yet
                </CardContent>
              </Card>
            ) : (
              allTasks.map((task) => (
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
                      <Badge variant={task.status === "completed" ? "default" : "secondary"}>
                        {task.status}
                      </Badge>
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

                    {task.status === "pending" && teamMembers.length > 0 && (
                      <div className="flex gap-2 items-center">
                        <Select onValueChange={(memberId) => assignTaskToMember(task.id, memberId)}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Assign to team member" />
                          </SelectTrigger>
                          <SelectContent>
                            {teamMembers.map((member) => (
                              <SelectItem key={member.id} value={member.id}>
                                {member.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {task.status === "completed" && task.verification_status === "pending" && (
                      <Button onClick={() => approveTask(task.id)} className="w-full">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve Task
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="map">
            <Card>
              <CardHeader>
                <CardTitle>Task Locations</CardTitle>
                <CardDescription>View all waste collection locations on map</CardDescription>
              </CardHeader>
              <CardContent>
                <WasteMap locations={mapLocations} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team" className="space-y-4">
            {teamMembers.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No team members yet
                </CardContent>
              </Card>
            ) : (
              teamMembers.map((member) => (
                <Card key={member.id}>
                  <CardContent className="p-6 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{member.full_name}</h3>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                    <Badge variant="outline">Team Member</Badge>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TeamLeaderDashboard;
