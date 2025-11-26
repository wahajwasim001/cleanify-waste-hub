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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserPlus } from "lucide-react";

const TeamLeaderDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [availableMembers, setAvailableMembers] = useState<any[]>([]);
  const [earnings, setEarnings] = useState(0);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
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

    // Get MY team members from team_memberships table
    const { data: myTeamData } = await supabase
      .from("team_memberships")
      .select("team_member_id")
      .eq("team_leader_id", user.id);

    let myTeamMembers: any[] = [];
    if (myTeamData && myTeamData.length > 0) {
      const memberIds = myTeamData.map(t => t.team_member_id);
      const { data: members } = await supabase
        .from("profiles")
        .select("*")
        .in("id", memberIds);
      myTeamMembers = members || [];
    }
    setTeamMembers(myTeamMembers);

    // Calculate stats
    const activeTasks = tasksData?.filter(t => t.status !== "completed").length || 0;
    const completedTasks = tasksData?.filter(t => t.status === "completed").length || 0;

    setStats({
      activeTasks,
      completedTasks,
      teamSize: myTeamMembers.length,
    });
  };

  const assignTaskToMember = async (taskId: string, memberId: string) => {
    try {
      const { error } = await supabase
        .from("waste_requests")
        .update({ assigned_member_id: memberId, status: "in_progress" })
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

  const loadAvailableMembers = async () => {
    console.log("loadAvailableMembers called, user:", user?.id);
    if (!user) {
      console.log("No user, returning");
      return;
    }

    // Get all team members with the role
    const { data: allMemberRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "team_member");

    console.log("All member roles:", allMemberRoles, "Error:", rolesError);

    if (!allMemberRoles || allMemberRoles.length === 0) {
      console.log("No team members found");
      setAvailableMembers([]);
      return;
    }

    // Get current team memberships
    const { data: myTeamData } = await supabase
      .from("team_memberships")
      .select("team_member_id")
      .eq("team_leader_id", user.id);

    console.log("My team data:", myTeamData);

    const myTeamMemberIds = myTeamData?.map(t => t.team_member_id) || [];
    const allMemberIds = allMemberRoles.map(r => r.user_id);
    const availableIds = allMemberIds.filter(id => !myTeamMemberIds.includes(id));

    console.log("Available IDs:", availableIds);

    if (availableIds.length > 0) {
      const { data: available } = await supabase
        .from("profiles")
        .select("*")
        .in("id", availableIds);
      console.log("Available members:", available);
      setAvailableMembers(available || []);
    } else {
      console.log("No available members after filtering");
      setAvailableMembers([]);
    }
  };

  const addTeamMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from("team_memberships")
        .insert({
          team_leader_id: user.id,
          team_member_id: memberId,
        });

      if (error) throw error;

      toast.success("Team member added successfully!");
      setAddMemberOpen(false);
      checkUser();
    } catch (error: any) {
      toast.error(error.message || "Failed to add team member");
    }
  };

  const removeTeamMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from("team_memberships")
        .delete()
        .eq("team_leader_id", user.id)
        .eq("team_member_id", memberId);

      if (error) throw error;

      toast.success("Team member removed");
      checkUser();
    } catch (error: any) {
      toast.error(error.message || "Failed to remove team member");
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

                    {task.photo_url && (
                      <div className="mb-4">
                        <p className="text-sm font-semibold mb-2">Citizen Photo:</p>
                        <img 
                          src={task.photo_url} 
                          alt="Waste location" 
                          className="rounded-lg w-full max-h-48 object-cover"
                        />
                      </div>
                    )}

                    {task.latitude && task.longitude && (
                      <div className="text-sm text-muted-foreground mb-4">
                        <MapPin className="h-4 w-4 inline mr-1" />
                        Coordinates: {task.latitude.toFixed(6)}, {task.longitude.toFixed(6)}
                      </div>
                    )}

                    {task.status === "assigned" && teamMembers.length > 0 && (
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
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>My Team Members</CardTitle>
                  <CardDescription>Manage your waste collection team</CardDescription>
                </div>
                <Dialog open={addMemberOpen} onOpenChange={(open) => {
                  setAddMemberOpen(open);
                  if (open) loadAvailableMembers();
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Member
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Team Member</DialogTitle>
                      <DialogDescription>
                        Select a team member to add to your team
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 mt-4">
                      {availableMembers.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No available team members to add
                        </p>
                      ) : (
                        availableMembers.map((member) => (
                          <Card key={member.id} className="cursor-pointer hover:bg-muted/50" onClick={() => addTeamMember(member.id)}>
                            <CardContent className="p-4 flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold text-sm">{member.full_name}</h4>
                                <p className="text-xs text-muted-foreground">{member.email}</p>
                              </div>
                              <Button size="sm" variant="ghost">Add</Button>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {teamMembers.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    No team members yet. Click "Add Member" to build your team.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {teamMembers.map((member) => (
                      <Card key={member.id}>
                        <CardContent className="p-4 flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{member.full_name}</h3>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">Team Member</Badge>
                            <Button 
                              size="sm" 
                              variant="destructive" 
                              onClick={() => removeTeamMember(member.id)}
                            >
                              Remove
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TeamLeaderDashboard;
