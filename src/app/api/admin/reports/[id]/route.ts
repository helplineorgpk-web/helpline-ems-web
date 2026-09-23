import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const report = await prisma.dailyReport.findUnique({
    where: { id },
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          employeeCode: true,
          designation: true,
          email: true,
          phone: true,
        },
      },
      project: true,
    },
  });
  if (!report) return jsonError("Report not found", 404);

  const attendance = await prisma.attendance.findUnique({
    where: {
      employeeId_date: {
        employeeId: report.employeeId,
        date: report.date,
      },
    },
  });

  return jsonOk({ report, attendance });
}
