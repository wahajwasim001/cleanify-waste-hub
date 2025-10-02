import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Leaf, LogOut, CheckCircle, Clock, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    setProfile(profile);

    // Get assigned tasks
    const { data: tasksData } = await supabase
      .from("waste_requests")
      .select("*, profiles!waste_requests_citizen_id_fkey(full_name)")
      .eq("assigned_team_id", user.id)
      .order("created_at", { ascending: false });

    setTasks(tasksData || []);

    // Get earnings
    const { data: earningsData } = await supabase
      .from("team_earnings")
      .select("amount_pkr")
      .eq("team_member_id", user.id);

    const totalEarnings = earningsData?.reduce((sum, e) => sum + Number(e.amount_pkr), 0) || 0;
    setEarnings(totalEarnings);
  };

  const markCompleted = async (taskId: string, bags: number) => {
    try {
      // Update task status
      const { error: updateError } = await supabase
        .from("waste_requests")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", taskId);

      if (updateError) throw updateError;

      // Calculate earnings (500 PKR per task for team leader assumption)
      const { error: earningsError } = await supabase
        .from("team_earnings")
        .insert({
          team_member_id: user!.id,
          waste_request_id: taskId,
          amount_pkr: 500,
          is_leader: true,
        });

      if (earningsError) throw earningsError;

      toast.success("Task marked as completed!");
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
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{earnings} PKR</div>
            </CardContent>
          </Card>
        </div>

        {/* Task List */}
        <Card>
          <CardHeader>
            <CardTitle>My Tasks</CardTitle>
            <CardDescription>Manage your assigned waste collection tasks</CardDescription>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No tasks assigned yet</p>
            ) : (
              <div className="space-y-4">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/30"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{task.profiles.full_name}</h3>
                        <Badge
                          variant={
                            task.status === "completed"
                              ? "default"
                              : task.status === "in_progress"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {task.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {task.number_of_bags} bags • {task.cost_pkr} PKR
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Requested: {new Date(task.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {task.status !== "completed" && (
                      <Button
                        size="sm"
                        onClick={() => markCompleted(task.id, task.number_of_bags)}
                        className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark Complete
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeamDashboard;
