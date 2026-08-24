import type { Resource } from './types';

/**
 * SPANISH — neutral professional U.S. Spanish.
 *
 * ==============================  REGISTER  ==============================
 *
 * "Usted", consistently. A company handling somebody's Social Security card and credit file is not
 * on "tú" terms with them, and "usted" is the neutral choice across every U.S. Spanish-speaking
 * community rather than a regional one.
 *
 * Vocabulary is U.S.-financial, not Iberian: "reporte de crédito" (not "informe"), "buró de crédito",
 * "disputa", "cuenta de cobranza". A consumer reading their own report will see these words on it.
 *
 * ==============================  WHAT IS NOT TRANSLATED  ==============================
 *
 * Zoey, Pinnacle Capital, Equifax, Experian, TransUnion, IdentityIQ, Apple, and the support address
 * appear verbatim. So does anything the consumer or a bureau supplied.
 *
 * ==============================  LEGAL STATUS  ==============================
 *
 * The strings here are product copy. The seven legal documents are NOT translated in this file --
 * see `lib/legal/` and the report. Nothing in this file changes a legal meaning, adds a guarantee,
 * or describes a capability the product does not have.
 */
export const es: Resource = {
  /* ---------------------------------------------------------------- common */
  'common.cancel': 'Cancelar',
  'common.continue': 'Continuar',
  'common.save': 'Guardar',
  'common.saving': 'Guardando…',
  'common.saved': 'Guardado',
  'common.retry': 'Intentar de nuevo',
  'common.close': 'Cerrar',
  'common.back': 'Atrás',
  'common.done': 'Listo',
  'common.notSet': 'Sin especificar',
  'common.loading': 'Cargando…',
  'common.learnMore': 'Más información',
  'common.notAvailableYet': 'Aún no disponible',
  'common.unavailable': 'No disponible',

  /* ------------------------------------------------------------- language */
  'language.title': 'Idioma',
  'language.subtitle': 'Elija cómo Zoey se comunica con usted',
  'language.english': 'English',
  'language.spanish': 'Español',
  'language.chooseTitle': 'Elija su idioma',
  'language.chooseBody': 'Puede cambiarlo en cualquier momento en Configuración.',
  'language.changed': 'Idioma actualizado',
  'language.a11ySelect': 'Seleccionar {language}',
  'language.a11ySelected': '{language}, seleccionado',
  'language.documentNote':
    'Este documento se muestra en inglés. Un abogado bilingüe está revisando la traducción al español antes del lanzamiento.',

  /* ------------------------------------------------------------------ tabs */
  'tabs.home': 'Inicio',
  'tabs.creditScore': 'Puntaje',
  'tabs.documents': 'Documentos',
  'tabs.disputes': 'Disputas',
  'tabs.more': 'Más',

  /* --------------------------------------------------------------- welcome */
  'welcome.getStarted': 'Comenzar',
  'welcome.signIn': 'Ya tengo una cuenta',

  /* ------------------------------------------------------------------ auth */
  'auth.welcomeTitle': 'Bienvenido a Zoey',
  'auth.signInMode': 'Iniciar sesión',
  'auth.createMode': 'Crear cuenta',
  'auth.email': 'Correo electrónico',
  'auth.password': 'Contraseña',
  'auth.signInButton': 'Iniciar sesión de forma segura',
  'auth.createButton': 'Crear mi cuenta',
  'auth.forgotPassword': '¿Olvidó su contraseña?',
  'auth.checkInfoTitle': 'Revise su información',
  'auth.checkInfoBody': 'Ingrese un correo electrónico válido y una contraseña de al menos 8 caracteres.',
  'auth.acceptRequiredTitle': 'Un paso más',
  'auth.acceptRequiredBody':
    'Lea y acepte los Términos de Uso y la Política de Privacidad para crear una cuenta.',
  'auth.acceptPrefix': 'He leído y acepto los',
  'auth.acceptTerms': 'Términos de Uso',
  'auth.acceptAnd': 'y la',
  'auth.acceptPrivacy': 'Política de Privacidad',
  'auth.acceptA11y': 'Aceptar los Términos de Uso y la Política de Privacidad',
  'auth.verifyEmailTitle': 'Revise su correo electrónico',
  'auth.verifyEmailBody': 'Abra el correo de verificación de Zoey antes de iniciar sesión.',
  'auth.unableTitle': 'No se pudo continuar',
  'auth.unableBody': 'Inténtelo de nuevo.',
  'auth.resetSentTitle': 'Revise su correo electrónico',
  'auth.resetSentBody': 'Le enviamos un enlace seguro para restablecer su contraseña.',
  'auth.resetFailedTitle': 'No se pudo enviar el correo de restablecimiento',
  'auth.enterEmailFirst': 'Primero ingrese su correo electrónico',
  'auth.legalLink': 'Aviso Legal y Privacidad',
  'auth.newPasswordTitle': 'Elija una nueva contraseña',
  'auth.newPasswordPlaceholder': 'Nueva contraseña',
  'auth.openingResetLink': 'Abriendo el enlace seguro de restablecimiento…',
  'auth.updatePassword': 'Actualizar contraseña',

  /* ------------------------------------------------------------- settings */
  'settings.title': 'Configuración',
  'settings.personalInformation': 'Información personal',
  'settings.loadingSettings': 'Cargando su configuración…',
  'settings.firstName': 'Nombre',
  'settings.lastName': 'Apellido',
  'settings.email': 'Correo electrónico',
  'settings.phone': 'Teléfono',
  'settings.city': 'Ciudad',
  'settings.state': 'Estado',
  'settings.saveChanges': 'Guardar cambios',
  'settings.couldNotSave': 'No se pudo guardar.',
  'settings.securityPrivacy': 'Seguridad y privacidad',
  'settings.passwordSignIn': 'Contraseña e inicio de sesión',
  'settings.passwordSignInDetail':
    'El restablecimiento de contraseña está disponible desde el inicio de sesión',
  'settings.dataPrivacyChoices': 'Opciones de datos y privacidad',
  'settings.dataPrivacyChoicesDetail': 'Consulte, corrija, exporte o elimine su información',
  'settings.legalPrivacy': 'Aviso legal y privacidad',
  'settings.legalPrivacyDetail':
    'Política de Privacidad, Términos y divulgaciones sobre IA y crédito',
  'settings.signOut': 'Cerrar sesión',
  'settings.signingOut': 'Cerrando sesión…',
  'settings.footerNote':
    'Zoey nunca muestra su número de Seguro Social, sus datos de identidad completos ni sus documentos en esta pantalla. Cerrar sesión borra la sesión protegida de este dispositivo. Eliminar su cuenta borra su perfil, documentos, disputas, metas e historial de puntajes, y no se puede deshacer: después se conserva una cantidad limitada de información, explicada en Aviso legal y privacidad.',

  /* -------------------------------------------------------- notifications */
  'notifications.title': 'Notificaciones',
  'notifications.disputeUpdates': 'Actualizaciones de disputas',
  'notifications.disputeUpdatesDetail': 'Cuando un buró de crédito responde a una disputa',
  'notifications.actionRequired': 'Acción requerida',
  'notifications.actionRequiredDetail': 'Cuando Zoey necesita un documento o una respuesta suya',
  'notifications.creditReportUpdates': 'Actualizaciones del reporte de crédito',
  'notifications.creditReportUpdatesDetail':
    'Cuando un nuevo reporte muestra un cambio de puntaje o de cuenta',
  'notifications.productNews': 'Novedades del producto',
  'notifications.productNewsDetail': 'Actualizaciones ocasionales sobre Zoey',
  'notifications.notDelivering':
    'Zoey todavía no envía notificaciones push. Sus preferencias se guardan y se aplicarán en cuanto lo haga.',
  'notifications.osDenied':
    'Las notificaciones están desactivadas para Zoey en la configuración de su dispositivo, así que no se puede entregar nada. Sus preferencias se guardan. Para permitirlas, abra la app Configuración, busque Zoey y active las Notificaciones.',
  'notifications.osNotDetermined':
    'Zoey todavía no le ha pedido permiso a su dispositivo para enviar notificaciones. Se lo pedirá la primera vez que haya algo que valga la pena enviar.',
  'notifications.osUnavailable':
    'Este dispositivo no puede recibir notificaciones de Zoey. Sus preferencias se guardan.',
  'notifications.couldNotSaveTitle': 'No se pudo guardar',
  'notifications.couldNotSaveBody': 'Ese cambio no se guardó. Revise su conexión.',
  'notifications.a11ySettings': 'Configuración de notificaciones',

  /* ------------------------------------------------------- account delete */
  'delete.action': 'Eliminar cuenta',
  'delete.deleting': 'Eliminando su cuenta…',
  'delete.a11yHint': 'Elimina permanentemente su cuenta y todos sus datos',
  'delete.confirmTitle': '¿Eliminar su cuenta de Zoey?',
  'delete.confirmBody':
    'Esto elimina su perfil, documentos, disputas, metas e historial de puntajes, y quita su inicio de sesión. No se puede deshacer y Zoey no puede recuperarlo. Después se conserva una cantidad limitada de información cuando es necesaria por seguridad o exigida por ley: consulte Aviso Legal y Privacidad.',
  'delete.finalTitle': '¿Eliminar permanentemente?',
  'delete.finalBody':
    'Última confirmación. Al eliminar se borran su cuenta y sus registros, y no podrá volver a iniciar sesión.',
  'delete.keepAccount': 'Conservar mi cuenta',
  'delete.deleteForever': 'Eliminar para siempre',
  'delete.failedTitle': 'No se pudo eliminar su cuenta',
  'delete.failedBody':
    'Zoey no pudo eliminar su cuenta. No se cambió nada. Revise su conexión e inténtelo de nuevo.',
  'delete.doneTitle': 'Cuenta eliminada',
  'delete.doneBody':
    'Su cuenta fue eliminada, pero este dispositivo no pudo borrar la sesión. Cierre y vuelva a abrir Zoey para terminar de cerrar sesión.',

  /* ------------------------------------------------------------- sign out */
  'signOut.confirmTitle': '¿Cerrar sesión en Zoey?',
  'signOut.confirmBody': 'Tendrá que iniciar sesión de nuevo para acceder a su caso.',

  /* ------------------------------------------------------------------ chat */
  'chat.title': 'Zoey',
  'chat.subtitle': 'Su asistente financiera',
  'chat.placeholder': 'Pregúntele a Zoey sobre su crédito',
  'chat.disclosure':
    'Zoey usa IA. Las respuestas pueden ser incompletas o inexactas: verifique cualquier información importante con sus propios registros.',
  'chat.disclosureLink': 'Más información',
  'chat.a11yDisclosure': 'Divulgación sobre IA',
  'chat.a11yDisclosureHint': 'Lea cómo Zoey usa la IA y lo que no puede hacer',
  'chat.lockedTitle': 'Chat con Zoey IA',
  'chat.lockedBlurb': 'Pregúntele a Zoey sobre su crédito y su caso',
  'chat.lockedBullet1': 'Respuestas basadas en sus propios registros de Zoey',
  'chat.lockedBullet2': 'Explicaciones de cada disputa y documento',
  'chat.lockedBullet3': 'Respuestas claras cuando falta algo',
  'chat.errorGeneric': 'No pude preparar una respuesta en este momento. Intente preguntar de nuevo.',

  /* --------------------------------------------------------------- legal */
  'legal.title': 'Aviso Legal y Privacidad',
  'legal.subtitle':
    'Qué hace Zoey con su información, qué puede y qué no puede hacer, y cómo eliminar su cuenta.',
  'legal.plainLanguage': 'En lenguaje sencillo',
  'legal.contact': 'Contacto',
  'legal.supportName': 'Soporte de Pinnacle',
  'legal.websiteTitle': 'pinnaclecapitalusa.com',
  'legal.websiteDetail': 'Estos documentos también están publicados en nuestro sitio web',
  'legal.draftBadge': 'Borrador',
  'legal.draftNoticeTitle': 'Algunos de estos documentos todavía son borradores',
  'legal.draftNoticeBody':
    'Describen cómo funciona Zoey hoy y están siendo revisados por un abogado antes del lanzamiento. Las secciones aún en revisión están marcadas dentro de cada documento.',
  'legal.documentDraftNotice':
    'Este es un borrador. Describe cómo funciona Zoey hoy y está siendo revisado por un abogado antes del lanzamiento.',
  'legal.underReview': 'En revisión legal',
  'legal.versionLine': 'Versión {version} · Vigente desde {effective}',
  'legal.notFound':
    'No se encontró ese documento. Vuelva a Aviso Legal y Privacidad para ver todo lo disponible.',
  'legal.alsoPublished': 'También publicado en pinnaclecapitalusa.com',
  'legal.a11yEmail': 'Enviar correo a {email}',
  'legal.a11yEmailHint': 'Abre su aplicación de correo',
  'legal.a11yViewOnWeb': 'Ver {title} en pinnaclecapitalusa.com',
  'legal.a11yViewOnWebHint': 'Abre la página pública en su navegador',
  'legal.noMailAppTitle': 'Escribir a soporte de Pinnacle',
  'legal.noMailAppBody':
    'No hay una aplicación de correo configurada en este dispositivo. Puede comunicarse con soporte en {email}.',
  'legal.plainLanguageBody1':
    'Zoey ofrece herramientas educativas e informativas y no es un bufete de abogados, prestamista, buró de crédito, asesor financiero ni asesor fiscal. La información proporcionada a través de Zoey no constituye asesoría legal, crediticia, fiscal ni de inversión.',
  'legal.plainLanguageBody2':
    'No se garantiza ningún aumento de puntaje, eliminación, aprobación, financiamiento ni plazo. Lo que ocurra con una disputa depende de los hechos, la evidencia y los burós y las empresas involucradas.',

  /* -------------------------------------------------------- subscription */
  'subscription.title': 'Suscripción',
  'subscription.notConnectedTitle': 'La facturación aún no está conectada',
  'subscription.notConnectedBody':
    'Zoey no puede mostrar su plan ni sus datos de pago hasta que se conecte un proveedor de facturación a esta aplicación.',
  'subscription.notConnectedNote':
    'Esta pantalla está lista para datos reales. Cuando la facturación esté conectada, mostrará su plan, precio, fecha de renovación y un enlace para administrar el pago: nada de lo que aparece aquí son precios de ejemplo.',
  'subscription.noneTitle': 'Sin suscripción activa',
  'subscription.noneBody': 'En este momento no tiene un plan en esta cuenta.',
  'subscription.currentPlan': 'Plan actual',
  'subscription.pastDue':
    'Su último pago no se procesó. Actualice su método de pago para que Zoey siga trabajando en su caso.',
  'subscription.manageBilling': 'Administrar facturación',
  'subscription.noPortal':
    'Todavía no hay un enlace al portal de facturación para este plan, así que los cambios de pago y la cancelación deben hacerse a través de soporte.',
  'subscription.memberSince': 'Miembro desde {date}',

  /* --------------------------------------------------------------- errors */
  'error.generic': 'Algo salió mal. Inténtelo de nuevo.',
  'error.offline': 'Zoey no puede conectarse a la red en este momento. Revise su conexión e inténtelo de nuevo.',
  'error.session': 'Su sesión terminó. Inicie sesión de nuevo para continuar.',
  'error.rateLimited': 'Fueron muchas solicitudes a la vez. Espere un momento e inténtelo de nuevo.',
  'error.tooLarge': 'Ese archivo es demasiado grande. El límite es {limit}.',
  'error.serverBusy': 'Zoey está ocupada en este momento. Inténtelo de nuevo en un momento.',

  /* ------------------------------------------------------------ documents */
  'documents.itemsReceived': { one: '{count} documento recibido', other: '{count} documentos recibidos' },
  'documents.itemsNeeded': {
    one: 'Falta {count} documento',
    other: 'Faltan {count} documentos',
  },

  /* --------------------------------------------------------------- states */
  'state.empty': 'Todavía no hay nada aquí',
  'state.errorTitle': 'Algo salió mal',
};
