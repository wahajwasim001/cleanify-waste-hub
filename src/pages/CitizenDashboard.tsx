import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Leaf, Trash2, Recycle, LogOut, TrendingUp, Camera, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera as CapCamera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Geolocation } from "@capacitor/geolocation";

const CitizenDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [bags, setBags] = useState(1);
  const [bottles, setBottles] = useState(0);
  const [cans, setCans] = useState(0);
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [stats, setStats] = useState({
    totalRequests: 0,
    totalRecycled: 0,
    totalEarnings: 0,
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

    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    setProfile(profile);

    // Get stats
    const { data: requests } = await supabase
      .from("waste_requests")
      .select("*")
      .eq("citizen_id", user.id);

    const { data: recycling } = await supabase
      .from("recycling_transactions")
      .select("*")
      .eq("citizen_id", user.id);

    const totalRecycled = recycling?.reduce((sum, r) => sum + (r.bottles || 0) + (r.cans || 0), 0) || 0;
    const totalEarnings = recycling?.reduce((sum, r) => sum + Number(r.reward_pkr), 0) || 0;

    setStats({
      totalRequests: requests?.length || 0,
      totalRecycled,
      totalEarnings,
    });
  };

  const capturePhoto = async () => {
    try {
      const image = await CapCamera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
      });

      if (image.base64String) {
        setPhoto(`data:image/${image.format};base64,${image.base64String}`);
        toast.success("Photo captured!");
      }
    } catch (error: any) {
      toast.error("Failed to capture photo");
    }
  };

  const getLocation = async () => {
    try {
      const position = await Geolocation.getCurrentPosition();
      const { latitude, longitude } = position.coords;

      // Reverse geocode to get address
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
      );
      const data = await response.json();

      setLocation({
        lat: latitude,
        lng: longitude,
        address: data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      });
      toast.success("Location captured!");
    } catch (error: any) {
      toast.error("Failed to get location");
    }
  };

  const handleRequestPickup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!photo || !location) {
      toast.error("Please add a photo and location before requesting pickup");
      return;
    }

    setLoading(true);
    const cost = bags * 20;

    try {
      // Upload photo to storage
      let photoUrl = null;
      if (photo) {
        const base64Data = photo.split(",")[1];
        const fileName = `${user.id}/${Date.now()}.jpg`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("waste-photos")
          .upload(fileName, decode(base64Data), {
            contentType: "image/jpeg",
          });

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from("waste-photos")
          .getPublicUrl(fileName);
        
        photoUrl = publicUrl;
      }

      const { error } = await supabase.from("waste_requests").insert({
        citizen_id: user.id,
        number_of_bags: bags,
        cost_pkr: cost,
        latitude: location?.lat,
        longitude: location?.lng,
        address: location?.address,
        photo_url: photoUrl,
      });

      if (error) throw error;

      toast.success(`Pickup requested! Cost: ${cost} PKR`);
      setBags(1);
      setPhoto(null);
      setLocation(null);
      checkUser();
    } catch (error: any) {
      toast.error(error.message || "Failed to request pickup");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to decode base64
  const decode = (base64: string) => {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const handleRecycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || (bottles === 0 && cans === 0)) {
      toast.error("Please add at least one item to recycle");
      return;
    }

    setLoading(true);
    const reward = (bottles + cans) * 5;

    try {
      const { error } = await supabase.from("recycling_transactions").insert({
        citizen_id: user.id,
        bottles,
        cans,
        reward_pkr: reward,
      });

      if (error) throw error;

      toast.success(`Recycling recorded! Reward: ${reward} PKR`);
      setBottles(0);
      setCans(0);
      checkUser();
    } catch (error: any) {
      toast.error(error.message || "Failed to record recycling");
    } finally {
      setLoading(false);
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
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Pickups</CardTitle>
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
              <CardTitle className="text-sm font-medium">Rewards Earned</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEarnings} PKR</div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Request Pickup */}
          <Card>
            <CardHeader>
              <CardTitle>Request Waste Pickup</CardTitle>
              <CardDescription>Add photo and location for pickup</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRequestPickup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bags">Number of Bags</Label>
                  <Input
                    id="bags"
                    type="number"
                    min="1"
                    value={bags}
                    onChange={(e) => setBags(Number(e.target.value))}
                  />
                </div>

                {/* Photo Capture */}
                <div className="space-y-2">
                  <Label>Waste Photo</Label>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={capturePhoto}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    {photo ? "Retake Photo" : "Take Photo"}
                  </Button>
                  {photo && (
                    <div className="mt-2 rounded-lg overflow-hidden border">
                      <img src={photo} alt="Waste" className="w-full h-32 object-cover" />
                    </div>
                  )}
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label>Pickup Location</Label>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={getLocation}
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    {location ? "Update Location" : "Get Location"}
                  </Button>
                  {location && (
                    <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                      {location.address}
                    </div>
                  )}
                </div>

                <div className="text-sm text-muted-foreground">
                  Total Cost: <span className="font-bold text-foreground">{bags * 20} PKR</span>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                  disabled={loading || !photo || !location}
                >
                  {loading ? "Requesting..." : "Request Pickup"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Recycling */}
          <Card>
            <CardHeader>
              <CardTitle>Recycle & Earn</CardTitle>
              <CardDescription>5 PKR per bottle or can</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRecycle} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bottles">Number of Bottles</Label>
                  <Input
                    id="bottles"
                    type="number"
                    min="0"
                    value={bottles}
                    onChange={(e) => setBottles(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cans">Number of Cans</Label>
                  <Input
                    id="cans"
                    type="number"
                    min="0"
                    value={cans}
                    onChange={(e) => setCans(Number(e.target.value))}
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  Reward: <span className="font-bold text-primary">{(bottles + cans) * 5} PKR</span>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-secondary to-accent hover:opacity-90"
                  disabled={loading}
                >
                  {loading ? "Recording..." : "Submit Recycling"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CitizenDashboard;
