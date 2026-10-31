import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const existing = await prisma.form.findFirst({
    where: { slug: "urun-geri-bildirim" },
  })

  if (existing) {
    console.log("Sample form already exists:", existing.id)
    return
  }

  const form = await prisma.form.create({
    data: {
      title: "Ürün Geri Bildirim Anketi",
      description:
        "Geri bildiriminizle hizmetimizi geliştirmemize yardımcı olun. Yaklaşık 2 dakika sürer.",
      slug: "urun-geri-bildirim",
      isPublished: true,
      questions: {
        create: [
          {
            orderIndex: 0,
            type: "SHORT_TEXT",
            label: "Adınız ve soyadınız nedir?",
            required: true,
            config: {
              placeholder: "Örn. Ayşe Yılmaz",
              description: "Lütfen adınızı ve soyadınızı girin",
            },
          },
          {
            orderIndex: 1,
            type: "SINGLE_CHOICE",
            label: "Genel deneyiminizi nasıl değerlendirirsiniz?",
            required: true,
            options: [
              { id: "opt_1", label: "Mükemmel" },
              { id: "opt_2", label: "İyi" },
              { id: "opt_3", label: "Orta" },
              { id: "opt_4", label: "Geliştirilmeli" },
            ],
            config: {},
          },
          {
            orderIndex: 2,
            type: "MULTIPLE_CHOICE",
            label: "En çok hangi özellikleri faydalı buluyorsunuz?",
            required: false,
            options: [
              { id: "feat_1", label: "Sürükle-bırak form oluşturucu" },
              { id: "feat_2", label: "Yanıt doğrulama" },
              { id: "feat_3", label: "CSV dışa aktarma" },
              { id: "feat_4", label: "Açık ve koyu tema" },
            ],
            config: {
              description: "Geçerli olanların tümünü seçin",
            },
          },
          {
            orderIndex: 3,
            type: "DROPDOWN",
            label: "Ne sıklıkla form oluşturuyorsunuz?",
            required: false,
            options: [
              { id: "freq_1", label: "Her gün" },
              { id: "freq_2", label: "Haftada bir" },
              { id: "freq_3", label: "Ayda bir" },
              { id: "freq_4", label: "Yılda birkaç kez" },
            ],
            config: {},
          },
          {
            orderIndex: 4,
            type: "FILE_UPLOAD",
            label: "Ekran görüntüsü veya belge ekleyin (isteğe bağlı)",
            required: false,
            config: {
              maxFileSizeMb: 10,
              allowedMimeTypes: ["application/pdf", "image/*"],
              description: "En fazla 10 MB, PDF veya görsel",
            },
          },
          {
            orderIndex: 5,
            type: "LONG_TEXT",
            label: "Eklemek istediğiniz öneri veya yorum var mı?",
            required: false,
            config: {
              placeholder: "Önerilerinizi buraya yazın...",
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
