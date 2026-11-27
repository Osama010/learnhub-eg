/* تنفيذ DataGateway بـ Firebase: بيجمّع دوال الـ infrastructure. بيستورده الـ composition root بس. */
import * as restore from "../infrastructure/firebase/restore.js";
import * as promos from "../infrastructure/firebase/promos.js";
import * as live from "../infrastructure/firebase/live.js";
import * as engage from "../infrastructure/firebase/engage.js";
import * as board from "../infrastructure/firebase/board.js";
import * as comments from "../infrastructure/firebase/comments.js";
import * as activity from "../infrastructure/firebase/activity.js";
import * as admins from "../infrastructure/firebase/admins.js";
import * as announcements from "../infrastructure/firebase/announcements.js";
import * as auth from "../infrastructure/firebase/auth.js";
import * as batch from "../infrastructure/firebase/batch.js";
import * as exams from "../infrastructure/firebase/exams.js";
import * as lessons from "../infrastructure/firebase/lessons.js";
import * as library from "../infrastructure/firebase/library.js";
import * as notes from "../infrastructure/firebase/notes.js";
import * as queries from "../infrastructure/firebase/queries.js";
import * as quizzes from "../infrastructure/firebase/quizzes.js";
import * as requests from "../infrastructure/firebase/requests.js";
import * as signups from "../infrastructure/firebase/signups.js";
import * as settings from "../infrastructure/firebase/settings.js";
import * as students from "../infrastructure/firebase/students.js";
import * as subjects from "../infrastructure/firebase/subjects.js";
import * as teachers from "../infrastructure/firebase/teachers.js";
import * as values from "../infrastructure/firebase/values.js";

export const infraData = Object.assign({}, activity, admins, announcements, auth, batch, board, live, engage, promos, comments, restore, exams, lessons, library, notes, queries, quizzes, requests, settings, signups, students, subjects, teachers, values);
