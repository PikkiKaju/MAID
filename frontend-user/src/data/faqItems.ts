import type { FAQItem } from "../models/profile";
import { TFunction } from "i18next";

export const getFaqItems = (t: TFunction): FAQItem[] => [
  {
    question: t("help.faq.q1"),
    answer: t("help.faq.a1"),
    category: t("help.categories.projects"),
  },
  {
    question: t("help.faq.q2"),
    answer: t("help.faq.a2"),
    category: t("help.categories.datasets"),
  },
  {
    question: t("help.faq.q3"),
    answer: t("help.faq.a3"),
    category: t("help.categories.projects"),
  },
  {
    question: t("help.faq.q4"),
    answer: t("help.faq.a4"),
    category: t("help.categories.account"),
  },
  {
    question: t("help.faq.q5"),
    answer: t("help.faq.a5"),
    category: t("help.categories.calculations"),
  },
  {
    question: t("help.faq.q6"),
    answer: t("help.faq.a6"),
    category: t("help.categories.projects"),
  },
  {
    question: t("help.faq.q7"),
    answer: t("help.faq.a7"),
    category: t("help.categories.calculations"),
  },
  {
    question: t("help.faq.q8"),
    answer: t("help.faq.a8"),
    category: t("help.categories.calculations"),
  },
  {
    question: t("help.faq.q9"),
    answer: t("help.faq.a9"),
    category: t("help.categories.projects"),
  },
  {
    question: t("help.faq.q10"),
    answer: t("help.faq.a10"),
    category: t("help.categories.projects"),
  },
  {
    question: t("help.faq.q11"),
    answer: t("help.faq.a11"),
    category: t("help.categories.projects"),
  },
  {
    question: t("help.faq.q12"),
    answer: t("help.faq.a12"),
    category: t("help.categories.datasets"),
  },
];

