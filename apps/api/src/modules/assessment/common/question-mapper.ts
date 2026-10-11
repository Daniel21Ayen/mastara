import { QuestionType } from "@mastara/database";

export interface BilingualTextResponse {
  en: string;
  am: string;
}

export interface QuestionOptionResponse {
  id: string;
  label: BilingualTextResponse;
}

export interface QuestionResponse {
  id: string;
  courseId?: string;
  prompt: BilingualTextResponse;
  explanation?: BilingualTextResponse;
  type: "SINGLE" | "TRUE_FALSE" | "MULTIPLE" | "SHORT";
  options?: QuestionOptionResponse[];
  correctOptionIds?: string[];
  acceptedAnswers?: string[];
}

export function mapDbQuestionType(
  dbType: QuestionType,
): "SINGLE" | "TRUE_FALSE" | "MULTIPLE" | "SHORT" {
  switch (dbType) {
    case QuestionType.SINGLE_CHOICE:
      return "SINGLE";
    case QuestionType.MULTIPLE_CHOICE:
      return "MULTIPLE";
    case QuestionType.TRUE_FALSE:
      return "TRUE_FALSE";
    case QuestionType.SHORT_ANSWER:
      return "SHORT";
    default:
      return "SINGLE";
  }
}

export function mapQuestionToContract(q: any): QuestionResponse {
  const type = mapDbQuestionType(q.type);
  const prompt: BilingualTextResponse = {
    en: q.prompt_en,
    am: q.prompt_am || q.prompt_en,
  };

  const explanation: BilingualTextResponse | undefined = q.explanation_en
    ? {
        en: q.explanation_en,
        am: q.explanation_am || q.explanation_en,
      }
    : undefined;

  if (type === "SHORT") {
    const acceptedAnswers = Array.isArray(q.correct_answers)
      ? (q.correct_answers as string[])
      : [String(q.correct_answers || "")];

    return {
      id: q.id,
      courseId: q.course_id,
      type: "SHORT",
      prompt,
      explanation,
      acceptedAnswers,
    };
  }

  const rawOptions = Array.isArray(q.options) ? q.options : [];
  const options: QuestionOptionResponse[] = rawOptions.map(
    (opt: any, index: number) => {
      const id = opt.id || String(index + 1);
      let labelEn = "";
      let labelAm = "";

      if (typeof opt.label === "string") {
        labelEn = opt.label;
        labelAm = opt.label;
      } else if (opt.label && typeof opt.label === "object") {
        labelEn = opt.label.en || "";
        labelAm = opt.label.am || labelEn;
      } else {
        labelEn = opt.label_en || `Option ${id}`;
        labelAm = opt.label_am || labelEn;
      }

      return {
        id,
        label: {
          en: labelEn,
          am: labelAm,
        },
      };
    },
  );

  const correctOptionIds = Array.isArray(q.correct_answers)
    ? (q.correct_answers as string[])
    : [String(q.correct_answers || "")];

  return {
    id: q.id,
    courseId: q.course_id,
    type,
    prompt,
    explanation,
    options,
    correctOptionIds,
  };
}
