const nodemailer = require("nodemailer");

const MEAL_TYPE_LABELS = {
  breakfast: "Doručak",
  lunch: "Ručak",
  dinner: "Večera",
  snack: "Užina",
};

const computeConsumed = (amountGrams, per100g) => {
  return (amountGrams / 100) * per100g;
};

async function sendWorkoutScheduleEmail(
  targetUser,
  planName,
  planColor,
  scheduledDate,
  exercisesWithSets,
  adminName,
) {
  try {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } =
      process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      console.warn("SMTP nije konfigurisan — email notifikacija preskočena.");
      return;
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT, 10),
      secure: SMTP_SECURE === "true",
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    const formattedDate = new Date(scheduledDate).toLocaleDateString(
      "sr-Latn-RS",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      },
    );

    const color = planColor || "#6366f1";

    let exerciseRows = "";
    for (const ex of exercisesWithSets) {
      const setsHtml = ex.sets
        .map((s) => {
          if (ex.has_weight && s.target_weight) {
            return `${s.set_number}. set: ${s.target_reps} pon. × ${s.target_weight} kg`;
          }
          return `${s.set_number}. set: ${s.target_reps} pon.`;
        })
        .join("<br>");

      exerciseRows += `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #1f2937; vertical-align: top;">
            ${ex.exercise_icon ? ex.exercise_icon + " " : ""}${ex.category_name}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #4b5563; font-size: 13px; line-height: 1.6;">
            ${setsHtml || "<em>Nema setova</em>"}
          </td>
        </tr>
      `;
    }

    const htmlBody = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
        <div style="background: ${color}; color: white; padding: 24px 28px;">
          <h2 style="margin: 0 0 4px; font-size: 20px;">🏋️ Novi trening zakazan!</h2>
          <p style="margin: 0; opacity: 0.9; font-size: 14px;">FitRecords — Plan treninga</p>
        </div>
        <div style="background: #f9fafb; padding: 24px 28px;">
          <div style="background: white; border-radius: 8px; padding: 16px 20px; margin-bottom: 16px; border: 1px solid #e5e7eb;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; font-weight: 600; color: #6b7280; width: 110px;">Plan:</td>
                <td style="padding: 6px 0; font-weight: 700; color: #1f2937;">${planName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: 600; color: #6b7280;">Datum:</td>
                <td style="padding: 6px 0; color: #1f2937;">📅 ${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: 600; color: #6b7280;">Zakazao:</td>
                <td style="padding: 6px 0; color: #1f2937;">${adminName}</td>
              </tr>
            </table>
          </div>

          <h3 style="margin: 0 0 12px; color: #374151; font-size: 16px;">📋 Vežbe u planu (${exercisesWithSets.length})</h3>
          <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 10px 12px; text-align: left; font-size: 13px; color: #6b7280; font-weight: 600;">Vežba</th>
                <th style="padding: 10px 12px; text-align: left; font-size: 13px; color: #6b7280; font-weight: 600;">Setovi</th>
              </tr>
            </thead>
            <tbody>
              ${exerciseRows}
            </tbody>
          </table>
        </div>
        <div style="background: #f3f4f6; padding: 14px 28px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
            Poslato iz FitRecords aplikacije — ${new Date().toLocaleString("sr-RS")}
          </p>
        </div>
      </div>
    `;

    const targetName =
      `${targetUser.first_name || ""} ${targetUser.last_name || ""}`.trim() ||
      targetUser.nickname ||
      "Korisnik";

    await transporter.sendMail({
      from: `"FitRecords" <${SMTP_USER}>`,
      to: targetUser.email,
      subject: `🏋️ Zakazan trening: ${planName} — ${formattedDate}`,
      html: htmlBody,
    });

    console.log(
      `Email notifikacija poslata korisniku ${targetName} (${targetUser.email})`,
    );
  } catch (err) {
    console.error("Greška pri slanju email notifikacije:", err.message);
  }
}

async function sendMealScheduleEmail(
  targetUser,
  planName,
  planColor,
  scheduledDate,
  mealsWithItems,
  adminName,
) {
  try {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } =
      process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      console.warn(
        "SMTP nije konfigurisan — email notifikacija za ishranu preskočena.",
      );
      return;
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT, 10),
      secure: SMTP_SECURE === "true",
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    const formattedDate = new Date(scheduledDate).toLocaleDateString(
      "sr-Latn-RS",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      },
    );

    const color = planColor || "#10b981";

    let mealRows = "";
    for (const meal of mealsWithItems) {
      const itemsHtml = (meal.items || [])
        .map((item) => {
          const name = item.food_item_name || item.custom_name || "Stavka";
          const amount = parseFloat(item.amount_grams) || 0;
          const kcal = computeConsumed(
            amount,
            parseFloat(item.kcal_per_100g) || 0,
          );
          const protein = computeConsumed(
            amount,
            parseFloat(item.protein_per_100g) || 0,
          );
          const carbs = computeConsumed(
            amount,
            parseFloat(item.carbs_per_100g) || 0,
          );
          const fat = computeConsumed(
            amount,
            parseFloat(item.fat_per_100g) || 0,
          );
          return `• ${name} — ${amount}g (${kcal.toFixed(0)} kcal, P:${protein.toFixed(1)}g, C:${carbs.toFixed(1)}g, F:${fat.toFixed(1)}g)`;
        })
        .join("<br>");

      mealRows += `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #1f2937; vertical-align: top;">
            ${MEAL_TYPE_LABELS[meal.meal_type] || meal.meal_type}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #4b5563; font-size: 13px; line-height: 1.6;">
            ${itemsHtml || "<em>Nema stavki</em>"}
          </td>
        </tr>
      `;
    }

    const htmlBody = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 680px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
        <div style="background: ${color}; color: white; padding: 24px 28px;">
          <h2 style="margin: 0 0 4px; font-size: 20px;">🍽️ Novi plan ishrane zakazan!</h2>
          <p style="margin: 0; opacity: 0.9; font-size: 14px;">FitRecords — Plan ishrane</p>
        </div>
        <div style="background: #f9fafb; padding: 24px 28px;">
          <div style="background: white; border-radius: 8px; padding: 16px 20px; margin-bottom: 16px; border: 1px solid #e5e7eb;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; font-weight: 600; color: #6b7280; width: 110px;">Plan:</td>
                <td style="padding: 6px 0; font-weight: 700; color: #1f2937;">${planName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: 600; color: #6b7280;">Datum:</td>
                <td style="padding: 6px 0; color: #1f2937;">📅 ${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: 600; color: #6b7280;">Zakazao:</td>
                <td style="padding: 6px 0; color: #1f2937;">${adminName}</td>
              </tr>
            </table>
          </div>

          <h3 style="margin: 0 0 12px; color: #374151; font-size: 16px;">📋 Obroci u planu (${mealsWithItems.length})</h3>
          <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 10px 12px; text-align: left; font-size: 13px; color: #6b7280; font-weight: 600;">Obrok</th>
                <th style="padding: 10px 12px; text-align: left; font-size: 13px; color: #6b7280; font-weight: 600;">Stavke</th>
              </tr>
            </thead>
            <tbody>
              ${mealRows}
            </tbody>
          </table>
        </div>
        <div style="background: #f3f4f6; padding: 14px 28px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
            Poslato iz FitRecords aplikacije — ${new Date().toLocaleString("sr-RS")}
          </p>
        </div>
      </div>
    `;

    const targetName =
      `${targetUser.first_name || ""} ${targetUser.last_name || ""}`.trim() ||
      targetUser.nickname ||
      "Korisnik";

    await transporter.sendMail({
      from: `"FitRecords" <${SMTP_USER}>`,
      to: targetUser.email,
      subject: `🍽️ Zakazan plan ishrane: ${planName} — ${formattedDate}`,
      html: htmlBody,
    });

    console.log(
      `Email notifikacija za plan ishrane poslata korisniku ${targetName} (${targetUser.email})`,
    );
  } catch (err) {
    console.error(
      "Greška pri slanju email notifikacije za plan ishrane:",
      err.message,
    );
  }
}

module.exports = {
  sendWorkoutScheduleEmail,
  sendMealScheduleEmail,
};
