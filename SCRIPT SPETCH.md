


**Diapositiva 1. SelfIQ**

Imaginen que entran a una tienda buscando un producto. El sistema indica que todavía hay existencias, pero al llegar al estante, está vacío.

Puede haber mercancía en bodega, pero nadie ha tenido tiempo de reponerla.

Ese es el problema que buscamos atender con SelfIQ: automatizar tareas del pequeño comercio, conectando las ventas con lo que ocurre físicamente en sus estantes.

[Pausa breve. Cambiar diapositiva.]

**Diapositiva 2. El problema**

En un negocio pequeño, una misma persona puede cobrar, recibir mercancía y atender a los clientes.

Revisar constantemente los estantes se convierte en otra tarea que compite por su tiempo. Así, un faltante puede pasar desapercibido y el cliente puede irse sin comprar.

Aunque el negocio utilice un punto de venta, sus registros no siempre reflejan lo que el cliente encuentra en la repisa. SelfIQ busca ayudar al encargado a detectar esa diferencia y revisarla a tiempo.

**Diapositiva 3. Nuestro primer cliente**

Nuestro cliente inicial sería una tienda de abarrotes o un mini mercado, con un solo local y un equipo reducido.

Nos enfocamos en negocios donde el dueño participa directamente en la operación y necesita herramientas fáciles de utilizar.

La propuesta es comenzar por algunas zonas de alta rotación. Así podemos probar la utilidad del sistema en un alcance pequeño, antes de ampliar la instalación.

**Diapositiva 4. Cómo funciona**

La solución coordina un punto de venta propio, o POS, con una cámara basada en un microcontrolador ESP32.

El POS registra las ventas y los movimientos de mercancía, y mantiene las existencias del negocio. La cámara estima qué tan ocupada está una zona del estante y registra sus cambios con fecha y hora.

Por ejemplo: si el sistema registra existencias, pero la repisa permanece vacía, SelfIQ puede generar una advertencia para que el encargado revise la situación.

El historial permite comparar cambios y ventas durante un periodo. Sin embargo, una diferencia puede deberse a reposición pendiente, mercancía fuera de lugar o un error de registro.

Por eso, la cámara no modifica automáticamente el inventario ni confirma un robo. La revisión final corresponde al encargado.

**Diapositiva 5. Guía y aforo**

SelfIQ también contempla una guía luminosa que señala dónde se encuentra un producto y un módulo de aforo que registra entradas y salidas mediante radar.

Cada microcontrolador realiza una tarea específica y una Raspberry Pi concentra la comunicación de los módulos.

El objetivo es automatizar actividades concretas con hardware sencillo y facilitar la operación diaria del negocio.

**Diapositiva 6. Competencia y diferenciación**

Ya existen soluciones para estas necesidades. Loyverse ofrece ventas e inventario, Focal Systems monitorea estantes y V-Count se especializa en conteo de visitantes.

Nuestra propuesta es reunir el POS, el monitoreo de repisas, la guía y el aforo en una solución modular orientada al pequeño comercio.

La ventaja que buscamos demostrar es que esta combinación resulte conveniente en costo, facilidad de uso y mantenimiento. Eso debe comprobarse en una tienda real.

**Diapositiva 7. Validación**

Actualmente, SelfIQ es un prototipo en desarrollo.

Proponemos un piloto de dos semanas en un comercio, comparando su operación antes y durante el uso del sistema.

Mediremos el tiempo de reposición, la utilidad de las alertas y los errores del conteo de personas. También preguntaremos al encargado si le ahorra trabajo y si estaría dispuesto a pagar por ese beneficio.

La validación debe demostrar tanto el funcionamiento técnico como su utilidad cotidiana.

**Diapositiva 8. Modelo de negocio y ventas**

El modelo propuesto combina un pago inicial por el kit y su instalación con una suscripción mensual por local.

El pago inicial cubriría los equipos, el montaje y la calibración. La mensualidad cubriría el uso de la plataforma, el historial y un servicio de soporte definido.

Para conseguir los primeros clientes comenzaríamos con visitas y demostraciones en comercios cercanos. Después del piloto, utilizaríamos resultados medidos y recomendaciones de los usuarios.

-->>“Para ilustrar cómo funcionaría el negocio, planteamos una mensualidad de 300 pesos por tienda. Si atender a cada tienda nos costara 100 pesos al mes, quedarían 200 para cubrir los gastos generales de SelfIQ.

Suponiendo gastos generales de 3 mil pesos mensuales, necesitaríamos 15 tiendas para cubrirlos. Con 20 tiendas quedarían mil pesos al mes, antes de impuestos y de recuperar el desarrollo. El cobro por instalación se calcula aparte.

Estas cifras son un escenario preliminar; los costos finales dependerán del consumo de los servicios y del soporte.”


**Diapositiva 9. Viabilidad y cierre**

El presupuesto corregido estima entre dos mil ochocientos cincuenta y cinco y tres mil ciento quince pesos en componentes. Todavía debemos agregar instalación, accesorios y garantía.

Como escenario ilustrativo, una mensualidad de trescientos pesos, un costo variable de cien por local y tres mil pesos de costos fijos requerirían quince locales para cubrir la operación mensual.

Estas cifras son supuestos por validar y no incluyen recuperar la inversión inicial de desarrollo.

Nuestro siguiente paso es probar SelfIQ en una tienda y demostrar su valor: ayudar al encargado a detectar qué necesita atención y dedicar menos tiempo a revisiones manuales.

Muchas gracias.


---

# V2


**ortada — Presentación**

Buenos días. Soy Erik García Chávez, estudiante de Ingeniería en Computación en la Universidad Autónoma de Baja California, campus Tijuana. Hoy les presento SelfIQ, una propuesta de automatización para pequeños comercios.

**SelfIQ — Introducción**

Imaginen que entran a una tienda buscando un producto. El sistema indica que todavía hay existencias, pero al llegar al estante, está vacío.

Puede haber mercancía en bodega, pero nadie ha tenido tiempo de reponerla.

SelfIQ busca ayudar al encargado a detectar esas situaciones, conectando las ventas con lo que ocurre físicamente en los estantes.

**Punto 1. El problema**

En un negocio pequeño, una misma persona puede cobrar, recibir mercancía y atender a los clientes.

Revisar constantemente los estantes compite por su tiempo. Así, un faltante puede pasar desapercibido y el cliente puede irse sin comprar.

El problema es que registrar existencias no garantiza que el producto esté disponible en la repisa cuando alguien lo necesita.

**Punto 2. Nuestro cliente**

Nuestro cliente inicial es una tienda de abarrotes o un mini mercado de Tijuana o Rosarito, con poco personal y un dueño que participa directamente en la operación.

Según el INEGI, las microempresas representan el 95.4% de las unidades económicas del sector privado y paraestatal. Además, entre 2018 y 2023 aumentaron en más de 81 mil los establecimientos de abarrotes, ultramarinos y misceláneas en México.

Dentro de ese mercado, comenzaremos con comercios cercanos y algunas zonas importantes de sus estantes.

**Punto 3. La solución**

SelfIQ conecta el sistema de ventas con una cámara que observa la ocupación de una zona del estante.

Si hay existencias registradas, pero la repisa permanece vacía, puede generar un aviso para que el encargado revise y reponga.

También incorpora luces para localizar productos y un conteo de personas para conocer la afluencia del negocio.

La cámara no confirma robos ni cambia automáticamente el inventario. Ayuda a identificar situaciones que requieren revisión.

Los estudios de GS1 México respaldan la importancia de la disponibilidad en estante. SelfIQ está en desarrollo, y su utilidad concreta se comprobará mediante pruebas en un comercio.

**Punto 4. Ventaja competitiva**

Nuestra propuesta reúne las ventas, el estado de los estantes, la ubicación de productos y la afluencia en una misma aplicación.

La instalación puede hacerse por etapas: comenzar con las zonas que más necesita vigilar el negocio y ampliar después.

Además de entregar el sistema, buscamos acompañar al comerciante en su instalación y uso cotidiano.

**Punto 5. Competencia**

Existen distintas alternativas. La revisión manual depende del tiempo del personal. Loyverse ofrece ventas e inventario; Focal Systems monitorea estantes, y V-Count se especializa en conteo de visitantes.

SelfIQ propone integrar estas necesidades en una solución para pequeños comercios, con equipos sencillos y una instalación ajustada al tamaño del local.

**Punto 6. Modelo de negocio**

El modelo combina un pago inicial por los equipos y la instalación con una suscripción mensual por sucursal.

El pago inicial cubre el montaje y la configuración. La mensualidad permite utilizar las funciones del sistema, consultar el historial y recibir soporte.

Ofrecemos un solo plan. Si el negocio necesita más puntos de monitoreo, las ampliaciones se cotizan por separado.

**Punto 7. Ventas y marketing**

Para conseguir los primeros clientes, comenzaremos con visitas a comercios cercanos y contacto por WhatsApp.

La demostración será concreta: mostrar un estante, un cambio en su ocupación y el aviso que recibe el encargado.

Después utilizaremos videos breves y recomendaciones de los comerciantes. La intención es que puedan ver cómo les ayuda antes de contratarlo.

**Punto 8. Viabilidad financiera y cierre**

Proponemos un paquete inicial de **5 mil pesos**, que incluye los equipos, la instalación y el primer mes de servicio.

Según nuestro presupuesto de materiales y mano de obra, montar el paquete cuesta aproximadamente entre **3 mil 210 y 3 mil 310 pesos**.

A partir del segundo mes, la suscripción sería de **600 pesos mensuales por sucursal**.

Por ejemplo, diez tiendas con mensualidad activa generarían **6 mil pesos al mes**. Al descontar una base estimada de **900 pesos para servidor y base de datos**, quedarían **5 mil 100 pesos para cubrir los demás gastos**.

Eso todavía no es ganancia: faltan el servicio de historial de sensores, consumo adicional, soporte e impuestos. El objetivo es sostener la operación mediante suscripciones, compartiendo la infraestructura entre los negocios.

SelfIQ busca ayudar al comerciante a detectar qué necesita atención y dedicar menos tiempo a revisar manualmente sus estantes.

Muchas gracias.
