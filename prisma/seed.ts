import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const existing = await prisma.form.findFirst({
    where: { slug: "product-feedback" },
  })

  if (existing) {
    console.log("Sample form already exists:", existing.id)
    return
  }

  const form = await prisma.form.create({
    data: {
      title: "Product Feedback & Experience Survey",
      description:
        "Help us improve our service by providing your feedback. Takes about 2 minutes to complete.",
      slug: "product-feedback",
      isPublished: true,
      questions: {
        create: [
          {
            orderIndex: 0,
            type: "SHORT_TEXT",
            label: "What is your full name?",
            required: true,
            config: {
              placeholder: "e.g. Jane Doe",
              description: "Please enter your first and last name",
            },
          },
          {
            orderIndex: 1,
            type: "SINGLE_CHOICE",
            label: "How would you rate your overall experience?",
            required: true,
            options: [
              { id: "opt_1", label: "Outstanding" },
              { id: "opt_2", label: "Good" },
              { id: "opt_3", label: "Average" },
              { id: "opt_4", label: "Needs Improvement" },
            ],
            config: {},
          },
          {
            orderIndex: 2,
            type: "MULTIPLE_CHOICE",
            label: "Which features do you find most valuable?",
            required: false,
            options: [
              { id: "feat_1", label: "Interactive Canvas & Live Inspector" },
              { id: "feat_2", label: "Dynamic Zod Schema Validation" },
              { id: "feat_3", label: "Multi-Device Viewport Simulation" },
              { id: "feat_4", label: "Dark & Light Theme Support" },
            ],
            config: {
              description: "Select all features that apply to your workflow",
            },
          },
          {
            orderIndex: 3,
            type: "DROPDOWN",
            label: "How frequently do you create or administer forms?",
            required: false,
            options: [
              { id: "freq_1", label: "Daily" },
              { id: "freq_2", label: "Weekly" },
              { id: "freq_3", label: "Monthly" },
              { id: "freq_4", label: "A few times a year" },
            ],
            config: {},
          },
          {
            orderIndex: 4,
            type: "FILE_UPLOAD",
            label: "Attach screenshots or supporting documentation (optional)",
            required: false,
            config: {
              maxFileSizeMb: 10,
              allowedMimeTypes: ["application/pdf", "image/*"],
              description: "PDF or image files up to 10MB",
            },
          },
          {
            orderIndex: 5,
            type: "LONG_TEXT",
            label: "Any additional suggestions or comments?",
            required: false,
            config: {
              placeholder: "Write your suggestions or ideas here...",
            },
          },
        ],
      },
    },
  })

  console.log("Successfully created sample form:", form.title, "ID:", form.id)
}

main()
  .catch((e) => {
    console.error("Seed error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
