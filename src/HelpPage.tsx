import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export function HelpPage() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft size={20} />
          Back
        </button>
        <h1 className="text-4xl font-bold text-center mb-8">Help & FAQ</h1>
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold mb-2">
              What is DayBridge?
            </h2>
            <p>
              DayBridge is a daily support planner for older adults and care
              circles. It uses AI to break routines, appointments, reminders,
              and help requests into manageable tasks and checkpoints.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold mb-2">
              How do I create a care plan?
            </h2>
            <p>
              You can create a new care plan by clicking the "Add Care Plan"
              button on the dashboard. DayBridge will ask a few questions and
              turn the need into practical steps.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold mb-2">
              How do I track my progress?
            </h2>
            <p>
              You can track your progress on the dashboard. Each care plan has a
              progress bar that shows you how close you are to completing it.
              You can also see a list of your tasks and mark them as complete
              as you finish them.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold mb-2">
              How do I contact support?
            </h2>
            <p>
              You can contact us by visiting the{" "}
              <button
                onClick={() => navigate("/contact")}
                className="text-cyan-400 hover:text-cyan-300 underline"
              >
                Contact Us
              </button>{" "}
              page and filling out the form. We'll get back to you as soon as possible.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
