import { hashPassword } from "../src/lib/password";
import { prisma } from "../src/lib/prisma";
import { todayPK } from "../src/lib/datetime";

async function main() {
  await prisma.dailyReport.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.projectAssignment.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.project.deleteMany();
  await prisma.projectType.deleteMany();
  await prisma.admin.deleteMany();

  await prisma.projectType.createMany({
    data: [
      { name: "School", slug: "SCHOOL", color: "sky", sortOrder: 1 },
      { name: "Masjid", slug: "MASJID", color: "leaf", sortOrder: 2 },
      { name: "Vocational Training Center", slug: "VTC", color: "amber", sortOrder: 3 },
      { name: "Orphan Care", slug: "ORPHAN", color: "rose", sortOrder: 4 },
      { name: "Welfare / Relief", slug: "WELFARE", color: "teal", sortOrder: 5 },
      { name: "Other", slug: "OTHER", color: "stone", sortOrder: 6 },
    ],
  });

  const admin = await prisma.admin.create({
    data: {
      name: "Helpline Admin",
      email: "admin@helpline.org",
      passwordHash: await hashPassword("admin123"),
    },
  });

  const projects = await Promise.all([
    prisma.project.create({
      data: {
        name: "Al-Kitab School",
        code: "SCH-001",
        type: "SCHOOL",
        location: "Rajanpur",
        description: "Primary and secondary education with Islamic studies.",
      },
    }),
    prisma.project.create({
      data: {
        name: "Emaan Maryam Smart School",
        code: "SCH-002",
        type: "SCHOOL",
        location: "Aligarh Educational Complex",
        description: "Early childhood and primary education for 300+ children.",
      },
    }),
    prisma.project.create({
      data: {
        name: "Masjid-e-Noor",
        code: "MSJ-001",
        type: "MASJID",
        location: "Karachi",
        description: "Masjid operations, imam duties, and community prayers.",
      },
    }),
    prisma.project.create({
      data: {
        name: "Vocational Training Center",
        code: "VTC-001",
        type: "VTC",
        location: "Karachi",
        description: "Skills training for youth and women.",
      },
    }),
    prisma.project.create({
      data: {
        name: "Orphan Care Program",
        code: "ORN-001",
        type: "ORPHAN",
        location: "Multiple campuses",
        description: "Sponsorship, education, and daily care for orphans.",
      },
    }),
    prisma.project.create({
      data: {
        name: "Mawakhat-e-Madina",
        code: "WLF-001",
        type: "WELFARE",
        location: "Sindh / Balochistan",
        description: "Village welfare, food, and community support.",
      },
    }),
  ]);

  const passwordHash = await hashPassword("Emp@123");

  const employees = await Promise.all([
    prisma.employee.create({
      data: {
        employeeCode: "EMP-0001",
        name: "Muhammad Ahmed",
        email: "ahmed@helpline.org",
        phone: "03001234501",
        passwordHash,
        designation: "Teacher",
      },
    }),
    prisma.employee.create({
      data: {
        employeeCode: "EMP-0002",
        name: "Fatima Khan",
        email: "fatima@helpline.org",
        phone: "03001234502",
        passwordHash,
        designation: "Project Coordinator",
        role: "SUPERVISOR",
      },
    }),
    prisma.employee.create({
      data: {
        employeeCode: "EMP-0003",
        name: "Ali Raza",
        email: "ali@helpline.org",
        phone: "03001234503",
        passwordHash,
        designation: "VTC Instructor",
      },
    }),
    prisma.employee.create({
      data: {
        employeeCode: "EMP-0004",
        name: "Ayesha Malik",
        email: "ayesha@helpline.org",
        phone: "03001234504",
        passwordHash,
        designation: "Teacher",
      },
    }),
    prisma.employee.create({
      data: {
        employeeCode: "EMP-0005",
        name: "Abdul Rahman",
        email: "rahman@helpline.org",
        phone: "03001234505",
        passwordHash,
        designation: "Imam",
      },
    }),
  ]);

  const [school1, school2, masjid, vtc, orphan, welfare] = projects;
  const [ahmed, fatima, ali, ayesha, rahman] = employees;

  await prisma.projectAssignment.createMany({
    data: [
      { employeeId: ahmed.id, projectId: school1.id },
      { employeeId: ayesha.id, projectId: school2.id },
      { employeeId: rahman.id, projectId: masjid.id },
      { employeeId: ali.id, projectId: vtc.id },
      { employeeId: fatima.id, projectId: school1.id },
      { employeeId: fatima.id, projectId: school2.id },
      { employeeId: fatima.id, projectId: orphan.id },
      { employeeId: fatima.id, projectId: welfare.id },
    ],
  });

  const today = todayPK();
  const yesterday = todayPK(new Date(Date.now() - 24 * 60 * 60 * 1000));

  const checkInToday = (hour: number, minute: number) => {
    const [y, m, d] = today.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d, hour - 5, minute));
  };
  const checkInYesterday = (hour: number, minute: number) => {
    const [y, m, d] = yesterday.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d, hour - 5, minute));
  };

  await prisma.attendance.createMany({
    data: [
      {
        employeeId: ahmed.id,
        projectId: school1.id,
        date: yesterday,
        checkInAt: checkInYesterday(8, 12),
        checkOutAt: checkInYesterday(16, 5),
      },
      {
        employeeId: fatima.id,
        projectId: orphan.id,
        date: yesterday,
        checkInAt: checkInYesterday(9, 2),
        checkOutAt: checkInYesterday(17, 10),
      },
      {
        employeeId: ali.id,
        projectId: vtc.id,
        date: yesterday,
        checkInAt: checkInYesterday(8, 40),
        checkOutAt: checkInYesterday(15, 50),
      },
      {
        employeeId: ayesha.id,
        projectId: school2.id,
        date: yesterday,
        checkInAt: checkInYesterday(8, 5),
        checkOutAt: checkInYesterday(14, 30),
      },
      {
        employeeId: rahman.id,
        projectId: masjid.id,
        date: yesterday,
        checkInAt: checkInYesterday(5, 50),
        checkOutAt: checkInYesterday(21, 10),
      },
      {
        employeeId: ahmed.id,
        projectId: school1.id,
        date: today,
        checkInAt: checkInToday(8, 8),
      },
      {
        employeeId: ayesha.id,
        projectId: school2.id,
        date: today,
        checkInAt: checkInToday(8, 21),
        checkOutAt: checkInToday(13, 40),
      },
      {
        employeeId: ali.id,
        projectId: vtc.id,
        date: today,
        checkInAt: checkInToday(9, 5),
      },
      {
        employeeId: rahman.id,
        projectId: masjid.id,
        date: today,
        checkInAt: checkInToday(5, 45),
      },
    ],
  });

  await prisma.dailyReport.createMany({
    data: [
      {
        employeeId: ahmed.id,
        projectId: school1.id,
        date: yesterday,
        summary: "Completed Grade 4 mathematics and Quran class.",
        details:
          "Took attendance of 42 students. Covered fractions in math. Afternoon Quran recitation with junior section. Informed parents of two absentees.",
      },
      {
        employeeId: fatima.id,
        projectId: orphan.id,
        date: yesterday,
        summary: "Orphan sponsorship follow-ups and hostel visit.",
        details:
          "Visited hostel, checked ration stock, and updated 6 sponsor files. Arranged medical checkup for two children.",
      },
      {
        employeeId: ali.id,
        projectId: vtc.id,
        date: yesterday,
        summary: "Tailoring batch practicals and machine maintenance.",
        details:
          "18 trainees completed stitching module 3. Two machines serviced. Prepared tomorrow’s pattern class.",
      },
      {
        employeeId: ayesha.id,
        projectId: school2.id,
        date: yesterday,
        summary: "Primary English and activity period.",
        details:
          "Lesson on phonics for KG. Distributed workbooks. Met with two mothers regarding irregular attendance.",
      },
      {
        employeeId: rahman.id,
        projectId: masjid.id,
        date: yesterday,
        summary: "Five daily prayers and evening Taleem.",
        details:
          "Led all prayers. After Maghrib held a short Taleem for youth. Cleanliness staff briefed for Jummah.",
      },
      {
        employeeId: ayesha.id,
        projectId: school2.id,
        date: today,
        summary: "Morning assembly and KG class completed.",
        details:
          "Conducted assembly, taught English rhymes, and submitted classroom inventory request before checkout.",
      },
    ],
  });

  console.log("Seeded Helpline EMS");
  console.log("Admin login: admin@helpline.org / admin123");
  console.log("Employee app login example: ahmed@helpline.org / Emp@123");
  console.log(`Admin id: ${admin.id}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
