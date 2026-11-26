/* Composition root: المكان الوحيد اللي بيركّب التنفيذ الفعلي (Firebase) على الـ use cases.
   الشاشات (controllers/views) بتستورد useCases من هنا ومبتعرفش Firebase. */
import { createUseCases } from "../application/usecases.js";
import { firebaseRepositories } from "../infrastructure/firebase/repositories.js";
import { bindData } from "./data.js";
import { infraData } from "./infra-data.js";
import { sha256Hex } from "../infrastructure/crypto.js";

export const useCases = createUseCases({ ...firebaseRepositories(), hashPin: sha256Hex,
  // ADMIN_EMAIL ثابت عام من config/firebase-config.js
  baseAdminEmail: typeof ADMIN_EMAIL === "string" ? ADMIN_EMAIL : "",
});

bindData(infraData);
