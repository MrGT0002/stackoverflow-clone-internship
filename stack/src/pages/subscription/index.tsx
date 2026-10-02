import Mainlayout from "@/layout/Mainlayout";
import { useAuth } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, CreditCard, Download, Loader2 } from "lucide-react";
import Head from "next/head";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const plans = [
  { key: "free", name: "Free", price: 0, description: "For getting started", features: ["1 question per day", "Basic search"] },
  { key: "bronze", name: "Bronze", price: 99, description: "For active learners", features: ["5 questions per day", "Bronze badge", "Advanced search filters"] },
  { key: "silver", name: "Silver", price: 299, description: "For serious contributors", features: ["15 questions per day", "Silver badge", "Priority support", "Enhanced profile visibility", "Unlimited bookmarks"] },
  { key: "gold", name: "Gold", price: 999, description: "For power users", features: ["Unlimited questions", "Gold badge", "Highest search priority", "Featured profile visibility", "Priority customer support", "Exclusive community"] },
];

const SubscriptionPage = () => {
  const { user } = useAuth();
  const [current, setCurrent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState("");
  const [usage, setUsage] = useState<any>(null);

  const load = async () => {
    if (!user) { setLoading(false); return; }
    try {
      const res = await axiosInstance.get("/subscription/me");
      setCurrent(res.data.data);
      const usageRes = await axiosInstance.get("/subscription/usage");
      setUsage(usageRes.data.data);
    } catch (error) {
      console.error(error);
      toast.error("Unable to load membership details");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user]);

  const startCheckout = async (plan: any) => {
    if (!user) { toast.info("Please login to continue"); return; }
    if (plan.key === "free") return;
    setBuying(plan.key);
    try {
      const res = await axiosInstance.post("/subscription/create", { plan: plan.key });
      const data = res.data.data;
      if (!window.Razorpay) throw new Error("Razorpay Checkout is not loaded");

      const options = {
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: "Code-Quest",
        description: `${data.plan.name} Membership`,
        prefill: { name: data.user.name, email: data.user.email },
        theme: { color: "#f48225" },
        handler: async (response: any) => {
          try {
            await axiosInstance.post("/subscription/verify", response);
            toast.success("Payment verified. Membership activation will follow Razorpay confirmation.");
            await load();
          } catch (error: any) {
            toast.error(error.response?.data?.message || "Payment verification failed");
          }
        },
        modal: { ondismiss: () => setBuying("") },
      };
      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", () => toast.error("Payment failed. Please try again."));
      rzp.open();
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || "Unable to start checkout");
    } finally { setBuying(""); }
  };

  return (
    <>
      <Head><script src="https://checkout.razorpay.com/v1/checkout.js" /></Head>
      <Mainlayout>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center mb-8">
            <div>
              <h1 className="text-2xl lg:text-3xl font-semibold text-gray-800">Premium Membership</h1>
              <p className="text-gray-600 mt-1">Choose a plan that matches how you use Code-Quest.</p>
            </div>
            {current?.subscription && <Badge className="bg-orange-100 text-orange-800 border-0">Current: {current.subscription.plan}</Badge>}
          </div>

          {!loading && usage && (
            <Card className="mb-8">
              <CardHeader><CardTitle>Today&apos;s question usage</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm mb-2"><span className="text-gray-600 capitalize">{usage.plan.name} plan</span><span className="font-semibold">{usage.unlimited ? `${usage.used} used · Unlimited` : `${usage.used} / ${usage.limit}`}</span></div>
                {!usage.unlimited && <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-orange-500" style={{ width: `${Math.min(100, (usage.used / Math.max(1, usage.limit)) * 100)}%` }} /></div>}
              </CardContent>
            </Card>
          )}

          {!loading && current?.subscription && (
            <Card className="mb-8">
              <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" /> Membership dashboard</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div><p className="text-gray-500">Plan</p><p className="font-semibold capitalize">{current.subscription.plan}</p></div>
                  <div><p className="text-gray-500">Status</p><p className="font-semibold capitalize">{current.subscription.status}</p></div>
                  <div><p className="text-gray-500">Renewal date</p><p className="font-semibold">{current.subscription.renewalDate ? new Date(current.subscription.renewalDate).toLocaleDateString() : "—"}</p></div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {plans.map((plan) => {
              const active = current?.subscription?.plan === plan.key && current?.subscription?.status === "active";
              return (
                <Card key={plan.key} className={active ? "border-orange-400 shadow-md" : ""}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between"><span>{plan.name}</span>{active && <Badge>Active</Badge>}</CardTitle>
                    <p className="text-sm text-gray-500">{plan.description}</p>
                    <div className="pt-2"><span className="text-3xl font-bold">₹{plan.price}</span>{plan.price > 0 && <span className="text-gray-500"> / month</span>}</div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature) => <li key={feature} className="flex gap-2 text-sm text-gray-700"><Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />{feature}</li>)}
                    </ul>
                    <Button disabled={active || buying === plan.key || plan.key === "free"} onClick={() => startCheckout(plan)} className="w-full bg-blue-600 hover:bg-blue-700">
                      {buying === plan.key ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Starting...</> : active ? "Current Plan" : plan.key === "free" ? "Free Plan" : "Subscribe"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {current?.invoices?.length > 0 && (
            <Card className="mt-8">
              <CardHeader><CardTitle>Payment history</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {current.invoices.map((item: any) => <div key={item._id} className="flex items-center justify-between border-b pb-3 text-sm"><div><p className="font-medium">{item.invoiceNumber}</p><p className="text-gray-500">{item.plan} · {new Date(item.issuedAt).toLocaleDateString()}</p></div><div className="font-semibold">₹{item.amount} <Download className="inline w-4 h-4 ml-1" /></div></div>)}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </Mainlayout>
    </>
  );
};

export default SubscriptionPage;
