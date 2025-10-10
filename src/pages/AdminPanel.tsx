import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Leaf, LogOut, Users, Trash2, Recycle, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminPanel = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRequests: 0,
    totalRecycled: 0,
    totalEarnings: 0,
  });
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [completedRequests, setCompletedRequests] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);

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

    // Check admin role from user_roles table
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      toast.error("Access denied");
      navigate("/dashboard");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    setProfile(profile);

    // Get all stats
    const { data: users } = await supabase.from("profiles").select("*");
    const { data: wasteRequests } = await supabase.from("waste_requests").select("*");
    const { data: recycling } = await supabase.from("recycling_transactions").select("*");

    const totalRecycled = recycling?.reduce((sum, r) => sum + (r.bottles || 0) + (r.cans || 0), 0) || 0;

    setStats({
      totalUsers: users?.length || 0,
      totalRequests: wasteRequests?.length || 0,
      totalRecycled,
      totalEarnings: 0,
    });

    // Get pending assignment requests
    const { data: pendingData } = await supabase
      .from("waste_requests")
      .select("*, profiles!waste_requests_citizen_id_fkey(full_name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    setPendingRequests(pendingData || []);

    // Get completed requests awaiting verification
    const { data: completedData } = await supabase
      .from("waste_requests")
      .select("*, profiles!waste_requests_citizen_id_fkey(full_name), team:profiles!waste_requests_assigned_team_id_fkey(full_name)")
      .eq("status", "completed")
      .eq("verification_status", "pending")
      .order("completed_at", { ascending: false });

    setCompletedRequests(completedData || []);

    // Get team leaders
    const { data: teamsData } = await supabase
      .from("user_roles")
      .select("user_id, profiles(*)")
      .eq("role", "team_leader");

    setTeams(teamsData?.map(t => t.profiles) || []);
  };

  const assignTask = async (requestId: string, teamId: string) => {
    try {
      const { error } = await supabase
        .from("waste_requests")
        .update({
          assigned_team_id: teamId,
          status: "assigned",
        })
        .eq("id", requestId);

      if (error) throw error;

      toast.success("Task assigned successfully!");
      checkUser();
    } catch (error: any) {
      toast.error(error.message || "Failed to assign task");
    }
  };

  const verifyTask = async (requestId: string, approved: boolean) => {
    try {
      const { error } = await supabase
        .from("waste_requests")
        .update({
          verification_status: approved ? "approved" : "rejected",
          verified_by: user.id,
          verified_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;

      toast.success(
        approved 
          ? "Task approved! Rewards distributed automatically." 
          : "Task rejected."
      );
      checkUser();
    } catch (error: any) {
      toast.error(error.message || "Failed to verify task");
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
              <Badge>Admin</Badge>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Admin Dashboard
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
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Waste Requests</CardTitle>
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRequests}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Items Recycled</CardTitle>
              <Recycle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRecycled}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Platform Impact</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">Growing</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6">
          {/* Pending Assignment */}
          <Card>
            <CardHeader>
              <CardTitle>Pending Assignment</CardTitle>
              <CardDescription>Assign tasks to cleaning teams</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingRequests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No pending requests</p>
              ) : (
                <div className="space-y-4">
                  {pendingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex flex-col p-4 border border-border rounded-lg bg-muted/30 gap-4"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">Request #{request.id.slice(0, 8)}</h3>
                          <Badge>{request.status}</Badge>
                        </div>
                        <p className="text-sm">
                          <strong>Citizen:</strong> {request.profiles.full_name}
                        </p>
                        <p className="text-sm">
                          <strong>Bags:</strong> {request.number_of_bags}
                        </p>
                        <p className="text-sm">
                          <strong>Citizen Reward:</strong> {request.reward_pkr} PKR
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm mb-2 block">Assign to Team Leader:</Label>
                        <div className="flex gap-2 flex-wrap">
                          {teams.map((team) => (
                            <Button
                              key={team.id}
                              size="sm"
                              variant="outline"
                              onClick={() => assignTask(request.id, team.id)}
                            >
                              {team.full_name}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Awaiting Verification */}
          <Card>
            <CardHeader>
              <CardTitle>Awaiting Verification</CardTitle>
              <CardDescription>Verify completed tasks and approve payments</CardDescription>
            </CardHeader>
            <CardContent>
              {completedRequests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No requests awaiting verification</p>
              ) : (
                <div className="space-y-4">
                  {completedRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex flex-col p-4 border border-border rounded-lg bg-muted/30 gap-4"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">Request #{request.id.slice(0, 8)}</h3>
                          <Badge variant="secondary">Completed</Badge>
                        </div>
                        <p className="text-sm">
                          <strong>Citizen:</strong> {request.profiles.full_name}
                        </p>
                        <p className="text-sm">
                          <strong>Team:</strong> {request.team?.full_name}
                        </p>
                        <p className="text-sm">
                          <strong>Bags:</strong> {request.number_of_bags}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Completed: {new Date(request.completed_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {request.before_photo_url && (
                          <div>
                            <p className="text-sm font-semibold mb-1">Before:</p>
                            <img src={request.before_photo_url} alt="Before" className="rounded-lg w-full h-32 object-cover" />
                          </div>
                        )}
                        {request.after_photo_url && (
                          <div>
                            <p className="text-sm font-semibold mb-1">After:</p>
                            <img src={request.after_photo_url} alt="After" className="rounded-lg w-full h-32 object-cover" />
                          </div>
                        )}
                      </div>

                      <div className="bg-blue-50 p-3 rounded-lg space-y-1 text-sm">
                        <p><strong>Citizen Reward:</strong> {request.reward_pkr} PKR</p>
                        <p><strong>Team Leader Payment:</strong> 500 PKR</p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => verifyTask(request.id, true)}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          Approve & Pay
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => verifyTask(request.id, false)}
                          variant="destructive"
                          className="flex-1"
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;