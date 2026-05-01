import { useParams } from "react-router-dom";
import { GoalDetail } from "./components/GoalDetail";
import { Id } from "../convex/_generated/dataModel";
import { useNavigate } from "react-router-dom";

export function GoalDetailWrapper() {
  const { goalId } = useParams<{ goalId: Id<"goals"> }>();
  const navigate = useNavigate();

  if (!goalId) {
    return <div>Care plan not found</div>;
  }

  return <GoalDetail goalId={goalId} onBack={() => navigate("/dashboard")} />;
}
