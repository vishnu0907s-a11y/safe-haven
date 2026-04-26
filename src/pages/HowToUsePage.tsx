import { useState } from "react";
import { ChevronRight, ChevronLeft, Home, Map, Shield, Heart, User, Bell, Trophy, Video, Phone, AlertTriangle, CheckCircle2, MapPin, Star, Clock, Camera, MessageSquare, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { cn } from "@/lib/utils";

interface Step {
  title: string;
  titleTa: string;
  description: string;
  descriptionTa: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  tips: string[];
  tipsTa: string[];
}

const womenSteps: Step[] = [
  {
    title: "Home / Dashboard",
    titleTa: "முகப்பு",
    description: "Your main hub. Press & hold the HELP ME button for 1 second to send an emergency SOS alert with your live GPS location via WhatsApp to all your emergency contacts.",
    descriptionTa: "உங்கள் முகப்பு பக்கம். HELP ME பொத்தானை 1 வினாடி அழுத்திப் பிடிக்கவும். இது உங்கள் GPS இருப்பிடத்தை WhatsApp வழியாக உங்கள் அனைத்து அவசர தொடர்புகளுக்கும் அனுப்பும்.",
    icon: Home,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
    tips: ["Hold the SOS button for 1 second to activate", "Once active, responders nearby will be notified", "Press 'I AM SAFE' when danger has passed"],
    tipsTa: ["SOS செயல்படுத்த 1 வினாடி அழுத்தவும்", "செயல்படுத்திய பின் அருகில் உள்ள மீட்பர்களுக்கு அறிவிப்பு வரும்", "ஆபத்து நீங்கியதும் 'நான் பாதுகாப்பாக இருக்கிறேன்' அழுத்தவும்"],
  },
  {
    title: "Live Map",
    titleTa: "நேரடி வரைபடம்",
    description: "View your live location, nearby danger zones (red/yellow areas), active emergency alerts, and the 3 nearest police stations. Tap any marker for details and directions.",
    descriptionTa: "உங்கள் நேரடி இருப்பிடம், அருகிலுள்ள ஆபத்து மண்டலங்கள், செயலில் உள்ள அவசர எச்சரிக்கைகள் மற்றும் 3 அருகிலுள்ள காவல் நிலையங்களை காண்க.",
    icon: Map,
    iconColor: "text-green-400",
    iconBg: "bg-green-400/10",
    tips: ["Red zones = High danger areas", "Blue markers = Police stations", "Tap a police station to get directions or call"],
    tipsTa: ["சிவப்பு மண்டலங்கள் = அதிக ஆபத்தான பகுதிகள்", "நீல குறிகள் = காவல் நிலையங்கள்", "காவல் நிலையத்தை தட்டி வழிகாட்டல் அல்லது அழைப்பு பெறுக"],
  },
  {
    title: "Record Video",
    titleTa: "வீடியோ பதிவு",
    description: "Record video evidence during emergencies. Videos are automatically uploaded to secure cloud storage and cannot be deleted — they serve as legal evidence.",
    descriptionTa: "அவசர சூழல்களில் வீடியோ ஆதாரங்களை பதிவு செய்யுங்கள். வீடியோக்கள் தானாகவே பாதுகாப்பான கிளவுட் சேமிப்பிற்கு பதிவேற்றப்படும் மற்றும் நீக்க முடியாது.",
    icon: Video,
    iconColor: "text-red-400",
    iconBg: "bg-red-400/10",
    tips: ["Tap the camera button to start recording", "Video records your GPS location automatically", "All videos are stored securely and tamper-proof"],
    tipsTa: ["பதிவு தொடங்க கேமரா பொத்தானை தட்டவும்", "வீடியோ தானாகவே GPS இருப்பிடத்தை பதிவு செய்யும்", "அனைத்து வீடியோக்களும் பாதுகாப்பாக சேமிக்கப்படும்"],
  },
  {
    title: "Safety & Contacts",
    titleTa: "பாதுகாப்பு & தொடர்புகள்",
    description: "Add emergency contacts who will receive WhatsApp alerts with your location when you press SOS. View safety tips and emergency helpline numbers.",
    descriptionTa: "அவசர தொடர்புகளை சேர்க்கவும். SOS அழுத்தும்போது அவர்களுக்கு WhatsApp மூலம் உங்கள் இருப்பிடம் அனுப்பப்படும். பாதுகாப்பு குறிப்புகளையும் அவசர எண்களையும் பார்க்கவும்.",
    icon: Heart,
    iconColor: "text-pink-400",
    iconBg: "bg-pink-400/10",
    tips: ["Tap '+' to add a new emergency contact", "Include country code (e.g., +91) in phone number", "Emergency numbers: Police 100, Ambulance 108, Women Helpline 1091"],
    tipsTa: ["புதிய தொடர்பு சேர்க்க '+' தட்டவும்", "தொலைபேசி எண்ணில் நாட்டுக் குறியீடு சேர்க்கவும் (எ.கா +91)", "அவசர எண்கள்: காவல் 100, ஆம்புலன்ஸ் 108, பெண்கள் 1091"],
  },
  {
    title: "Profile",
    titleTa: "சுயவிவரம்",
    description: "View and edit your profile details, check your verification status, toggle dark/light mode, and sign out. Your account must be verified by admin to access all features.",
    descriptionTa: "சுயவிவர விவரங்களை பார்க்கவும் மற்றும் திருத்தவும், சரிபார்ப்பு நிலையை சரிபார்க்கவும், இருண்ட/ஒளி பயன்முறையை மாற்றவும் மற்றும் வெளியேறவும்.",
    icon: User,
    iconColor: "text-purple-400",
    iconBg: "bg-purple-400/10",
    tips: ["Tap 'Edit Profile' to update your name, phone, city", "Check 'Verification Status' to see if admin has approved you", "Tap the ☰ menu icon to access Settings and Support"],
    tipsTa: ["'சுயவிவரத்தை திருத்து' தட்டி பெயர், தொலைபேசி, நகரம் மாற்றவும்", "'சரிபார்ப்பு நிலை' தட்டி நிர்வாகி ஒப்புதல் நிலையை பார்க்கவும்", "☰ மெனு ஐக்கான் தட்டி அமைப்புகள் மற்றும் ஆதரவு பெறவும்"],
  },
];

const responderSteps: Step[] = [
  {
    title: "Home / Dashboard",
    titleTa: "முகப்பு",
    description: "Your command center. Check in to start your duty shift, view active emergency alerts nearby, and accept alerts to respond. Your live location is broadcast when on duty.",
    descriptionTa: "உங்கள் கட்டுப்பாட்டு மையம். கடமையை தொடங்க Check In செய்யுங்கள், அருகிலுள்ள செயலில் உள்ள அவசர எச்சரிக்கைகளை பாருங்கள், எச்சரிக்கைகளை ஏற்று பதிலளிக்கவும்.",
    icon: Home,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
    tips: ["Check In at the start of your shift to become visible to victims", "Accept alerts to navigate to their location on the map", "Check Out when your shift ends"],
    tipsTa: ["கடமை தொடங்கும்போது Check In செய்யுங்கள்", "எச்சரிக்கைகளை ஏற்று வரைபடத்தில் பாதிக்கப்பட்டவர் இடத்திற்கு செல்லுங்கள்", "கடமை முடியும்போது Check Out செய்யுங்கள்"],
  },
  {
    title: "Live Map",
    titleTa: "நேரடி வரைபடம்",
    description: "View active emergency alerts on the map. Navigate to victim locations, view danger zones, and find nearby police stations. Active alerts appear as pulsing red markers.",
    descriptionTa: "வரைபடத்தில் செயலில் உள்ள அவசர எச்சரிக்கைகளை பாருங்கள். பாதிக்கப்பட்டவர் இடத்திற்கு செல்லுங்கள், ஆபத்து மண்டலங்களை பாருங்கள்.",
    icon: Map,
    iconColor: "text-green-400",
    iconBg: "bg-green-400/10",
    tips: ["Red pulsing markers = Active SOS alerts", "Tap a marker to see victim details and get directions", "Your location is shown as a blue dot"],
    tipsTa: ["சிவப்பு துடிக்கும் குறிகள் = செயலில் உள்ள SOS எச்சரிக்கைகள்", "விவரங்களுக்கு குறியை தட்டவும்", "உங்கள் இருப்பிடம் நீல புள்ளியாக காட்டப்படும்"],
  },
  {
    title: "Points & Leaderboard",
    titleTa: "புள்ளிகள் & தரவரிசை",
    description: "Earn points for every rescue you complete. 10 points are distributed among all responders who accepted the alert. View your rescue history and rank on the leaderboard.",
    descriptionTa: "ஒவ்வொரு மீட்புக்கும் புள்ளிகள் பெறுங்கள். 10 புள்ளிகள் எச்சரிக்கையை ஏற்ற அனைத்து மீட்பர்களிடையே பகிரப்படும். மீட்பு வரலாறு மற்றும் தரவரிசையை பாருங்கள்.",
    icon: Trophy,
    iconColor: "text-amber-400",
    iconBg: "bg-amber-400/10",
    tips: ["Accept & complete alerts to earn points", "Rating from victims increases your leaderboard rank", "Weekly, monthly, and all-time leaderboards available"],
    tipsTa: ["புள்ளிகள் பெற எச்சரிக்கைகளை ஏற்று முடிக்கவும்", "பாதிக்கப்பட்டவர்களின் மதிப்பீடு தரவரிசையை மேம்படுத்தும்", "வாராந்திர, மாதாந்திர மற்றும் அனைத்து நேர தரவரிசைகள் உள்ளன"],
  },
  {
    title: "Alerts History",
    titleTa: "எச்சரிக்கை வரலாறு",
    description: "View live and past emergency alerts. See which alerts are active, which are resolved, and track your response history. Respond to active alerts directly from this page.",
    descriptionTa: "நேரடி மற்றும் கடந்த அவசர எச்சரிக்கைகளை பாருங்கள். செயலில் உள்ளவை, தீர்க்கப்பட்டவை மற்றும் உங்கள் பதில் வரலாற்றை கண்காணிக்கவும்.",
    icon: Bell,
    iconColor: "text-red-400",
    iconBg: "bg-red-400/10",
    tips: ["Live tab shows active ongoing emergencies", "History tab shows all past alerts", "Tap an alert to accept and navigate to the victim"],
    tipsTa: ["நேரடி தாவல் செயலில் உள்ள அவசரங்களை காட்டும்", "வரலாறு தாவல் கடந்த அனைத்து எச்சரிக்கைகளையும் காட்டும்", "பாதிக்கப்பட்டவரிடம் செல்ல எச்சரிக்கையை தட்டவும்"],
  },
  {
    title: "Profile",
    titleTa: "சுயவிவரம்",
    description: "Manage your account details, check verification status, view your role and city assignment. Admins must approve your account before you can accept emergency alerts.",
    descriptionTa: "கணக்கு விவரங்களை நிர்வகிக்கவும், சரிபார்ப்பு நிலையை சரிபார்க்கவும். நிர்வாகி உங்கள் கணக்கை ஒப்புதல் அளிக்கும் வரை அவசர எச்சரிக்கைகளை ஏற்க முடியாது.",
    icon: User,
    iconColor: "text-purple-400",
    iconBg: "bg-purple-400/10",
    tips: ["Verified badge = You can accept emergency alerts", "Pending = Wait for admin approval", "Keep your profile updated for accurate dispatch"],
    tipsTa: ["சரிபார்க்கப்பட்டது = அவசர எச்சரிக்கைகளை ஏற்கலாம்", "நிலுவையில் = நிர்வாகி ஒப்புதலுக்காக காத்திருக்கவும்", "துல்லியமான அனுப்பலுக்கு சுயவிவரத்தை புதுப்பிக்கவும்"],
  },
];

function StepCard({ step, index, lang }: { step: Step; index: number; lang: string }) {
  const title = lang === "ta" ? step.titleTa : step.title;
  const description = lang === "ta" ? step.descriptionTa : step.description;
  const tips = lang === "ta" ? step.tipsTa : step.tips;
  const Icon = step.icon;

  return (
    <div className="glass-card rounded-3xl p-5 space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-500">
      {/* Step Header */}
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0">
          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", step.iconBg)}>
            <Icon className={cn("w-6 h-6", step.iconColor)} />
          </div>
          <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center">
            {index + 1}
          </span>
        </div>
        <div>
          <p className="font-black text-sm">{title}</p>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
            {lang === "ta" ? "படி" : "Step"} {index + 1}
          </p>
        </div>
      </div>

      {/* Mock Phone Screen */}
      <div className="relative mx-auto w-full max-w-[220px]">
        <div className="rounded-3xl border-2 border-border/60 bg-background/80 backdrop-blur overflow-hidden shadow-2xl">
          {/* Phone Status Bar */}
          <div className="bg-card/80 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-primary" />
              <span className="text-[8px] font-black text-primary">ResQHer</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-1.5 rounded-sm border border-muted-foreground/40" />
            </div>
          </div>
          {/* Screen Content Mockup */}
          <div className={cn("p-3 min-h-[160px] flex flex-col items-center justify-center gap-2", step.iconBg)}>
            <Icon className={cn("w-10 h-10 opacity-60", step.iconColor)} />
            <p className="text-[9px] font-black text-center opacity-70">{title.toUpperCase()}</p>
            <div className="space-y-1 w-full">
              <div className="h-1.5 rounded-full bg-current opacity-10 w-full" />
              <div className="h-1.5 rounded-full bg-current opacity-10 w-3/4 mx-auto" />
              <div className="h-1.5 rounded-full bg-current opacity-10 w-1/2 mx-auto" />
            </div>
          </div>
          {/* Bottom nav mock */}
          <div className="bg-card/80 px-2 py-1.5 flex items-center justify-around border-t border-border/40">
            {[Home, Map, Bell, User].map((NavIcon, i) => (
              <NavIcon key={i} className={cn("w-3 h-3", i === 0 ? "text-primary" : "text-muted-foreground/40")} />
            ))}
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>

      {/* Tips */}
      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">
          {lang === "ta" ? "குறிப்புகள்" : "Key Tips"}
        </p>
        {tips.map((tip, i) => (
          <div key={i} className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-accent mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">{tip}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HowToUsePage() {
  const { user } = useAuth();
  const { lang } = useI18n();
  const [activeStep, setActiveStep] = useState<number | null>(null);

  const isWomen = user?.role === "women";
  const steps = isWomen ? womenSteps : responderSteps;

  const roleLabel = lang === "ta"
    ? (isWomen ? "பெண் பயனர்" : user?.role === "police" ? "காவல்துறை" : user?.role === "driver" ? "ஓட்டுநர்" : "பொது பாதுகாவலர்")
    : (isWomen ? "Women" : user?.role === "police" ? "Police" : user?.role === "driver" ? "Driver" : "Public Protector");

  return (
    <div className="px-4 pb-8 space-y-4">
      {/* Header Card */}
      <div className="glass-card rounded-3xl p-5 text-center space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto glow-primary">
          <Shield className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-lg font-black">
          {lang === "ta" ? "செயலியை பயன்படுத்துவது எப்படி" : "How to Use ResQHer"}
        </h1>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
          <span className="text-xs font-bold text-primary">{roleLabel} {lang === "ta" ? "வழிகாட்டி" : "Guide"}</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {lang === "ta"
            ? "உங்கள் பாத்திரத்திற்கான படி-படியான வழிகாட்டி. ஒவ்வொரு பிரிவும் எப்படி செயல்படுகிறது என்பதை கீழே காணுங்கள்."
            : "Step-by-step guide for your role. Learn how each section of the app works."}
        </p>
      </div>

      {/* Steps */}
      {activeStep === null ? (
        // Step index list
        <div className="space-y-3 animate-in fade-in duration-300">
          <p className="label-caps px-1">
            {lang === "ta" ? "பிரிவுகளை தேர்வு செய்க" : "Select a Section"}
          </p>
          {steps.map((step, i) => {
            const Icon = step.icon;
            const title = lang === "ta" ? step.titleTa : step.title;
            const desc = lang === "ta" ? step.descriptionTa : step.description;
            return (
              <button
                key={i}
                onClick={() => setActiveStep(i)}
                className="w-full glass-card rounded-2xl p-4 flex items-center gap-3 hover:bg-primary/5 transition-all active:scale-[0.98] text-left group"
              >
                <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0", step.iconBg)}>
                  <Icon className={cn("w-5 h-5", step.iconColor)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{title}</p>
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">{desc.slice(0, 60)}...</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] font-black text-muted-foreground/50">
                    {lang === "ta" ? "படி" : "Step"} {i + 1}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        // Step detail view
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setActiveStep(null)}
              className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              {lang === "ta" ? "பட்டியலுக்கு திரும்பு" : "Back to list"}
            </button>
            <div className="flex items-center gap-1">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveStep(i)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    i === activeStep ? "bg-primary w-4" : "bg-muted-foreground/30"
                  )}
                />
              ))}
            </div>
          </div>

          <StepCard step={steps[activeStep]} index={activeStep} lang={lang} />

          {/* Navigation */}
          <div className="flex gap-3">
            {activeStep > 0 && (
              <button
                onClick={() => setActiveStep(activeStep - 1)}
                className="flex-1 py-3 rounded-2xl glass-card border border-border/40 text-sm font-bold flex items-center justify-center gap-2 hover:bg-secondary/40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                {lang === "ta" ? "முந்தைய" : "Previous"}
              </button>
            )}
            {activeStep < steps.length - 1 && (
              <button
                onClick={() => setActiveStep(activeStep + 1)}
                className="flex-1 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 glow-primary active:scale-[0.98] transition-transform"
              >
                {lang === "ta" ? "அடுத்தது" : "Next"}
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Quick SOS Reminder for Women */}
      {isWomen && (
        <div className="glass-card rounded-2xl p-4 border border-destructive/20 animate-in fade-in duration-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm font-black text-destructive">
                {lang === "ta" ? "நினைவில் வைக்கவும்" : "Remember"}
              </p>
              <p className="text-xs text-muted-foreground">
                {lang === "ta"
                  ? "ஆபத்தான சூழல்களில் SOS பொத்தானை 1 வினாடி அழுத்திப் பிடிக்கவும்"
                  : "In danger? Hold SOS button for 1 second — help is on the way"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
