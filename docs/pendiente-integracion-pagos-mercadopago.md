# Pendiente: reactivar el cobro con MercadoPago en el registro de empresa

## Estado actual (temporal)

`POST /api/companys/register` (`companys/service/company.service.ts` → `register`) activa la
empresa **de una**, sin comunicarse con MercadoPago:

- `company.is_enabled: 'A'`
- `user.is_enabled: true` (el dueño puede loguear apenas se registra)
- `subscription.status: 'ACTIVE'`, `gateway: 'MANUAL'`
- No se genera ningún link de pago ni se manda ningún email al dueño.

Esto es a propósito, mientras la app corre en local — la integración real de cobro **ya está
construida y probada en sandbox**, solo desconectada del flujo de alta. Reactivarla es
mayormente deshacer los cambios de este hilo, no reconstruir nada.

## Qué ya existe y funciona (no hay que reescribirlo)

| Pieza | Archivo |
|---|---|
| Genera el Preapproval en MercadoPago (link de pago, 7 días de trial) | `saas/service/saasCheckout.service.ts` |
| Webhook que activa la empresa cuando MercadoPago confirma la autorización | `saas/service/saasWebhook.service.ts`, `saas/controllers/webhook.controller.ts`, `saas/routes/webhook.route.ts` |
| Validación de firma del webhook (`WebhookSignatureValidator` del SDK) | dentro de `saasWebhook.service.ts` |
| Email "activa tu empresa" con el link de pago | `notificacions/service/notification.service.ts` + `notificacions/service/emailEvents.config.ts` + `notificacions/templates/email/companyPendingPayment.ts` |
| Columna `mp_preapproval_id` en la suscripción, para que el webhook la encuentre | modelo `SaaSSubscription` + baseline `028_baseline_saas_subscriptions.ts` |

Probado en sandbox de punta a punta: se generó el Preapproval real vía curl (`collector_id`
resuelto correctamente al vendedor de prueba de la app), y por API real desde el backend
(logs con `subscription_id`, `back_url`, `free_trial` todos correctos).

## Para reactivarlo, en `company.service.ts` → `register()`

1. Volver los estados a "pendiente": `company.is_enabled: 'P'`, `user.is_enabled: false`,
   `subscription.status: 'PENDING'`, `gateway: 'MERCADOPAGO'`.
2. Después de la transacción (nunca adentro — es una llamada de red), llamar de nuevo a
   `SaaSCheckoutService.createPaymentLink(subscription, plan, billingPeriod, ownerEmail, country)`.
3. Si devuelve `paymentUrl`, llamar a
   `NotificationService.notify(NotificationEvents.COMPANY_PENDING_PAYMENT, {...})` con los
   datos del dueño/empresa/plan — ver el git history de este archivo para la versión exacta
   (commit donde se movió a activación directa).
4. `company.controller.ts` — volver a devolver `paymentUrl` en el `extra` de `ApiResponse.created`.
5. Frontend: `CompanyService.register()` (ADMIN_APP) — volver a tipar/devolver `paymentUrl`.

## Para producción (no antes)

- **Credenciales**: cambiar `MP_ACCESS_TOKEN`/`MP_PUBLIC_KEY` a las de **producción** de la
  app (no las de prueba) — se sacan de "Credenciales de producción" en el panel de
  MercadoPago, no de "Credenciales de prueba".
- **Sin usuarios de prueba**: en producción `payer_email` es directo el correo real del
  formulario — no hace falta `MP_TEST_PAYER_EMAIL`, y de hecho hay que asegurarse de que
  `resolvePayerEmail` (`saasCheckout.service.ts`) nunca lo use ahí (ya está resuelto: solo
  aplica si `NODE_ENV === 'development'`).
- **`FRONT_ADMIN_BOOKING`**: cambiar de la URL de ngrok/local a la URL real donde esté
  desplegado el `ADMIN_APP`. Es solo el rebote del navegador después de autorizar — no
  afecta la activación (eso lo hace el webhook), pero conviene que sea prolijo.
- **Webhook**: la URL pública real del backend + `/api/saas/webhooks/mercadopago` hay que
  cargarla en MercadoPago bajo **"Modo productivo"** (pestaña aparte de "Modo de prueba" en
  Webhooks), con su propia `MP_WEBHOOK_SECRET` — es una clave distinta a la de prueba.

## Pendiente real, sin construir todavía

La segunda rama del webhook — el cobro automático que hace MercadoPago al terminar el
trial de 7 días (`type: 'payment'`, generar `SaaSInvoice`, extender `current_period_end`,
pasar `status` de `TRIAL` a `ACTIVE`) — nunca se implementó. Solo se probó la rama
`subscription_preapproval` (alta del trial). Hay que construirla y probarla contra un
trial real vencido (o el sandbox de MercadoPago si tiene manera de acelerar el trial).

## Notas de sandbox (para no perder tiempo la próxima vez)

Cosas no obvias que costaron varias vueltas al probar esto en desarrollo:

- **Comprador y vendedor de prueba son cuentas distintas** — las "Credenciales de prueba"
  de tu propia app YA actúan en nombre de un vendedor de prueba autogenerado (no hace falta
  loguearse como él ni crear una app aparte). El comprador de prueba es una cuenta separada
  ("Cuentas de prueba" → Buyer Test User) — su email real está en su perfil, no es
  `test_user_<UserID>@testuser.com` armado a mano (esa construcción no funcionó, dio "User
  bad request" hasta usar el email exacto que muestra el perfil de la cuenta).
- Si accidentalmente usás las credenciales propias de la cuenta compradora como si fueran
  del vendedor, el error es "Payer and collector cannot be the same user" — literal y claro.
- Al pagar en el checkout de MercadoPago, si tu navegador tiene sesión iniciada con la
  cuenta real en cualquier pestaña, puede aparecer "Una de las partes... es de prueba"
  incluso en incógnito (fingerprint/cookies de terceros) — usar un navegador distinto por
  completo para loguearte como comprador de prueba, no solo otra pestaña.
- En el formulario de tarjeta de prueba, el campo **"Nombre del titular" no es un nombre**:
  hay que poner la palabra clave del resultado que querés simular (`APRO` = aprobado,
  `OTHE` = rechazado, `CONT` = pendiente, `CALL` = rechazado con validación) — dejar un
  nombre real ahí da un resultado indefinido.
