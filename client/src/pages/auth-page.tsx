import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, InsertUser } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Loader2, User, Lock, Monitor, ChevronDown, Check } from "lucide-react";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const loginSchema = z.object({
    username: z.string().min(1, "Username is required"),
    password: z.string().min(1, "Password is required"),
    keepLoggedIn: z.boolean().default(false),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function AuthPage() {
    const { user, loginMutation, registerMutation } = useAuth();
    const [, setLocation] = useLocation();
    const [isLogin, setIsLogin] = useState(true);
    const [showForgotDialog, setShowForgotDialog] = useState(false);
    const [forgotUsername, setForgotUsername] = useState("");
    const [isSubmittingForgot, setIsSubmittingForgot] = useState(false);

    if (user) {
        setLocation("/");
        return null;
    }

    const loginForm = useForm<LoginValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { username: "", password: "", keepLoggedIn: false },
    });

    const registerForm = useForm<InsertUser>({
        resolver: zodResolver(insertUserSchema),
        defaultValues: {
            username: "",
            password: "",
            fullName: "",
            location: "",
            division: "",
        },
    });

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#542d91] relative overflow-hidden font-sans selection:bg-cyan-500/30 py-12">
            {/* Background Mountain Silhouettes */}
            <div className="absolute inset-0 z-0 opacity-30">
                <div className="absolute bottom-0 left-[5%] w-[45%] h-[40%] bg-[#48257e]" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
                <div className="absolute bottom-0 left-[-10%] w-[55%] h-[50%] bg-[#3d1f6a]" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
                <div className="absolute bottom-0 right-[5%] w-[50%] h-[45%] bg-[#3d1f6a]" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
                <div className="absolute bottom-0 right-[-10%] w-[45%] h-[35%] bg-[#321958]" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
            </div>

            <div className="relative z-10 w-full max-w-[500px] bg-[#2d3748] rounded-[32px] overflow-hidden shadow-[0_60px_150px_-30px_rgba(0,0,0,1)] animate-in fade-in zoom-in duration-500 mx-6">

                {/* Top Section - Illustration */}
                <div className="relative h-48 md:h-52 overflow-hidden border-b border-white/5">
                    <img
                        src="/login-banner.png"
                        alt="Auth Illustration"
                        className="w-full h-full object-cover"
                    />

                    {/* Chevron Divider */}
                    <div
                        className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-[#2d3748] rounded-full border-[6px] border-[#2d3748] flex items-center justify-center z-10 shadow-xl cursor-pointer hover:bg-[#344053] transition-colors"
                        onClick={() => setIsLogin(!isLogin)}
                    >
                        <ChevronDown className={cn("w-6 h-6 text-white transition-transform duration-500", !isLogin && "rotate-180")} />
                    </div>
                </div>

                {/* Bottom Section - Form */}
                <div className="p-8 pt-10 md:p-10 md:pt-12">
                    <div className="text-center mb-8">
                        <h2 className="text-[13px] font-bold text-gray-300 uppercase tracking-[0.3em] opacity-80">
                            {isLogin ? "USER LOGIN" : "CREATE ACCOUNT"}
                        </h2>
                    </div>

                    {isLogin ? (
                        <Form {...loginForm}>
                            <form onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))} className="space-y-5">
                                <FormField
                                    control={loginForm.control}
                                    name="username"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1">
                                            <FormControl>
                                                <div className="relative">
                                                    <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
                                                    <Input
                                                        {...field}
                                                        placeholder="USERNAME"
                                                        className="bg-[#242c3b] border-[#3a4454] text-white h-13 pl-14 rounded-full focus:ring-1 focus:ring-cyan-500/20 focus:border-cyan-500/40 transition-all placeholder:text-gray-600 placeholder:text-[10px] placeholder:font-bold placeholder:tracking-widest"
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage className="text-[10px] text-rose-400 pl-4" />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={loginForm.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1">
                                            <FormControl>
                                                <div className="relative">
                                                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
                                                    <Input
                                                        {...field}
                                                        type="password"
                                                        placeholder="PASSWORD"
                                                        className="bg-[#242c3b] border-[#3a4454] text-white h-13 pl-14 rounded-full focus:ring-1 focus:ring-cyan-500/20 focus:border-cyan-500/40 transition-all placeholder:text-gray-600 placeholder:text-[10px] placeholder:font-bold placeholder:tracking-widest"
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage className="text-[10px] text-rose-400 pl-4" />
                                        </FormItem>
                                    )}
                                />
                                <div className="flex items-center justify-between px-4 pt-1">
                                    <FormField
                                        control={loginForm.control}
                                        name="keepLoggedIn"
                                        render={({ field }) => (
                                            <div
                                                className="flex items-center gap-2 cursor-pointer group"
                                                onClick={() => field.onChange(!field.value)}
                                            >
                                                <div className={cn(
                                                    "w-4.5 h-4.5 rounded-full border-2 transition-all flex items-center justify-center",
                                                    field.value
                                                        ? "border-cyan-400 bg-cyan-400/10"
                                                        : "border-cyan-500/40 bg-[#242c3b] group-hover:border-cyan-400"
                                                )}>
                                                    {field.value && <div className="w-2.5 h-2.5 bg-cyan-400 rounded-full" />}
                                                </div>
                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight group-hover:text-gray-300">Keep me logged in</span>
                                            </div>
                                        )}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowForgotDialog(true)}
                                        className="text-[10px] font-bold text-gray-400 hover:text-cyan-400 transition-colors uppercase tracking-tight"
                                    >
                                        Forgot Password?
                                    </button>
                                </div>
                                <div className="pt-6 flex justify-center">
                                    <Button
                                        type="submit"
                                        disabled={loginMutation.isPending}
                                        className="w-40 h-11 bg-gradient-to-r from-cyan-400 to-purple-500 hover:scale-105 rounded-full text-white font-black text-xs tracking-[0.2em] shadow-xl shadow-cyan-500/10 transition-all active:scale-95"
                                    >
                                        {loginMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "LOGIN"}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    ) : (
                        <Form {...registerForm}>
                            <form onSubmit={registerForm.handleSubmit((data) => registerMutation.mutate(data))} className="space-y-4">
                                <FormField
                                    control={registerForm.control}
                                    name="username"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1">
                                            <FormControl>
                                                <div className="relative">
                                                    <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
                                                    <Input {...field} placeholder="USERNAME" className="bg-[#242c3b] border-[#3a4454] text-white h-12 pl-14 rounded-full focus:ring-1 focus:border-cyan-500/40 transition-all placeholder:text-gray-600 placeholder:text-[10px] placeholder:font-bold placeholder:tracking-widest" />
                                                </div>
                                            </FormControl>
                                            <FormMessage className="text-[10px] text-rose-400 pl-4" />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={registerForm.control}
                                    name="fullName"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1">
                                            <FormControl>
                                                <div className="relative">
                                                    <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
                                                    <Input {...field} value={field.value || ""} placeholder="FULL NAME" className="bg-[#242c3b] border-[#3a4454] text-white h-12 pl-14 rounded-full focus:ring-1 focus:border-cyan-500/40 transition-all placeholder:text-gray-600 placeholder:text-[10px] placeholder:font-bold placeholder:tracking-widest" />
                                                </div>
                                            </FormControl>
                                            <FormMessage className="text-[10px] text-rose-400 pl-4" />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={registerForm.control}
                                    name="division"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1">
                                            <FormControl>
                                                <div className="relative">
                                                    <Monitor className="absolute left-5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
                                                    <Input {...field} placeholder="DIVISION" className="bg-[#242c3b] border-[#3a4454] text-white h-12 pl-14 rounded-full focus:ring-1 focus:border-cyan-500/40 transition-all placeholder:text-gray-600 placeholder:text-[10px] placeholder:font-bold placeholder:tracking-widest" />
                                                </div>
                                            </FormControl>
                                            <FormMessage className="text-[10px] text-rose-400 pl-4" />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={registerForm.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1">
                                            <FormControl>
                                                <div className="relative">
                                                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
                                                    <Input {...field} type="password" placeholder="PASSWORD" className="bg-[#242c3b] border-[#3a4454] text-white h-12 pl-14 rounded-full focus:ring-1 focus:border-cyan-500/40 transition-all placeholder:text-gray-600 placeholder:text-[10px] placeholder:font-bold placeholder:tracking-widest" />
                                                </div>
                                            </FormControl>
                                            <FormMessage className="text-[10px] text-rose-400 pl-4" />
                                        </FormItem>
                                    )}
                                />
                                <div className="pt-4 flex justify-center">
                                    <Button
                                        type="submit"
                                        disabled={registerMutation.isPending}
                                        className="w-40 h-11 bg-gradient-to-r from-cyan-400 to-purple-500 hover:scale-105 rounded-full text-white font-black text-xs tracking-[0.2em] shadow-xl shadow-cyan-500/10 transition-all active:scale-95"
                                    >
                                        {registerMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "SIGN UP"}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    )}

                    <p className="text-center mt-8">
                        <button
                            type="button"
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-[10px] font-black text-gray-500 hover:text-white transition-colors tracking-widest uppercase border-b border-transparent hover:border-gray-500 pb-1"
                        >
                            {isLogin ? "Don't have an account? Join Now" : "Already have an account? Back to Login"}
                        </button>
                    </p>
                </div>

                <div className="bg-[#242c3b] p-6 text-center border-t border-white/5">
                    <p className="text-[9px] text-gray-600 font-bold tracking-[0.4em] uppercase">
                        designed by <span className="text-gray-400">GMR GLOBAL</span>
                    </p>
                </div>
            </div>
            {/* Forgot Password Dialog */}
            <Dialog open={showForgotDialog} onOpenChange={setShowForgotDialog}>
                <DialogContent className="sm:max-w-[425px] bg-[#2d3748] border-white/10 text-white rounded-[24px]">
                    <DialogHeader>
                        <DialogTitle className="text-white uppercase tracking-widest text-sm">Reset Password</DialogTitle>
                        <DialogDescription className="text-gray-400 text-xs">
                            Enter your username below and we'll send you a password reset link.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="forgot-username" className="text-[10px] uppercase font-bold text-gray-500 tracking-widest pl-2">Username</Label>
                            <div className="relative">
                                <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <Input
                                    id="forgot-username"
                                    value={forgotUsername}
                                    onChange={(e) => setForgotUsername(e.target.value)}
                                    placeholder="your_username"
                                    className="bg-[#242c3b] border-[#3a4454] h-12 pl-12 rounded-full focus:ring-1 focus:ring-cyan-500/20 text-white"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            onClick={() => {
                                if (!forgotUsername) {
                                    toast.error("Please enter your username");
                                    return;
                                }
                                setIsSubmittingForgot(true);
                                // Simulate API call
                                setTimeout(() => {
                                    setIsSubmittingForgot(false);
                                    setShowForgotDialog(false);
                                    toast.success("Reset link sent!", {
                                        description: `If an account exists for ${forgotUsername}, you will receive a reset link shortly.`,
                                    });
                                    setForgotUsername("");
                                }, 1500);
                            }}
                            className="w-full bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full text-white font-black text-[10px] tracking-widest h-11"
                            disabled={isSubmittingForgot}
                        >
                            {isSubmittingForgot ? <Loader2 className="w-4 h-4 animate-spin" /> : "SEND RESET LINK"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
