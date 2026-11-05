# Guion de exposición — SelfIQ

**Presenta:** Erik García Chávez  
**Presentación:** SelfIQ_2026-2_Finanzas_aclaradas.pptx  
**Duración orientativa:** 4–5 minutos, según el ritmo y las pausas.

Las indicaciones entre corchetes son para ti; no se leen en voz alta. La numeración siguiente corresponde a las diapositivas del archivo, incluyendo la portada.

## Diapositiva 1. Portada

Buenos días. Soy Erik García Chávez, estudiante de Ingeniería en Computación en la Universidad Autónoma de Baja California, campus Tijuana. Hoy les presento SelfIQ, una propuesta de automatización para pequeños comercios.

[Cambiar diapositiva.]

## Diapositiva 2. SelfIQ

Imaginen que entran a una tienda buscando un producto. El sistema indica que hay existencias, pero al llegar al estante, está vacío.

Puede haber mercancía en bodega, pero nadie ha tenido tiempo de reponerla. SelfIQ busca ayudar al encargado a detectar estas situaciones, conectando las ventas con lo que ocurre en los estantes.

## Diapositiva 3. Punto 1: el problema

En un negocio pequeño, una misma persona puede cobrar, recibir mercancía y atender a los clientes.

Revisar los estantes compite por su tiempo. Un faltante puede pasar desapercibido y el cliente puede irse sin comprar.

Tener existencias registradas no garantiza que el producto esté disponible en la repisa cuando alguien lo necesita.

## Diapositiva 4. Punto 2: nuestro cliente

Nuestro cliente inicial es una tienda de abarrotes o un mini mercado de Tijuana o Rosarito, con poco personal y un dueño que también atiende.

Según el INEGI, las microempresas representan el 95.4 por ciento de las unidades económicas del sector privado y paraestatal. Además, entre 2018 y 2023, los establecimientos de abarrotes, ultramarinos y misceláneas aumentaron en 81 mil 500 unidades en México.

Comenzaremos con negocios cercanos que cuenten con internet.

## Diapositiva 5. Punto 3: la solución

SelfIQ conecta el sistema de ventas con una cámara que observa la ocupación de una zona del estante.

Si hay existencias registradas, pero la repisa permanece vacía, puede avisar al encargado para que revise. También incorpora luces para localizar productos y un conteo de personas para conocer la afluencia.

La cámara no confirma robos ni modifica automáticamente el inventario: señala cambios que requieren revisión.

GS1 México documenta la relación entre desabasto y venta perdida. Ese es el problema que atendemos; SelfIQ sigue en desarrollo y su beneficio se comprobará en un comercio.

## Diapositiva 6. Punto 4: ventaja competitiva

Nuestra propuesta reúne ventas, estado de los estantes, ubicación de productos y afluencia en una misma aplicación.

La instalación puede hacerse por etapas, comenzando por las zonas importantes y ampliándose después. La oferta combina los equipos con instalación y acompañamiento para el comerciante.

## Diapositiva 7. Punto 5: competencia

El cliente ya tiene alternativas. Puede revisar manualmente, utilizar Loyverse para ventas e inventario, Focal Systems para monitoreo de estantes o V-Count para conteo de visitantes.

SelfIQ propone integrar esas necesidades en una solución orientada al pequeño comercio, con equipos sencillos y una instalación ajustada al local.

## Diapositiva 8. Punto 6: modelo de negocio

Tenemos dos ingresos distintos: un pago inicial por los equipos instalados y una suscripción mensual por sucursal.

El pago inicial cubre el montaje y la configuración. La mensualidad incluye las funciones del sistema, el historial y el soporte definido para el servicio.

Ofrecemos un solo plan; los dispositivos adicionales se cotizan aparte.

## Diapositiva 9. Punto 7: ventas y marketing

Comenzaremos con visitas a comercios cercanos y contacto por WhatsApp.

La demostración mostrará un caso concreto: un estante que se vacía y el aviso que recibe el encargado. Después, utilizaremos videos breves y recomendaciones entre comerciantes para conseguir nuevos clientes.

## Diapositiva 10. Punto 8: viabilidad financiera y cierre

[Señalar primero el pago inicial y después la mensualidad.]

Cada tienda pagaría **5 mil pesos una sola vez** por el paquete instalado y el primer mes incluido. El paquete contiene una cámara, un módulo de guía, uno de aforo y una unidad central de comunicación.

Montarlo cuesta entre **3 mil 210 y 3 mil 310 pesos**, incluyendo materiales y mano de obra.

[Señalar la fila de diez tiendas.]

Con diez instalaciones cobraríamos **50 mil pesos**. Usando el costo mayor, gastaríamos 33 mil 100 en montaje y 900 en la nube base del mes. Quedarían **16 mil pesos antes de otros gastos**.

Desde el segundo mes, esas diez tiendas pagarían **600 pesos cada una al mes**: **6 mil pesos mensuales**. Después de la nube base quedarían **5 mil 100 pesos para los demás gastos**.

Una instalación cubre su montaje y esa base de nube del primer mes. Dos suscripciones cubren la nube base mensual. Esto todavía no significa ganancia neta: faltan el historial de sensores, soporte, consumo adicional e impuestos.

SelfIQ busca ayudar al comerciante a detectar qué necesita atención y dedicar menos tiempo a revisar manualmente sus estantes. Muchas gracias.

## Diapositiva 11. Referencias bibliográficas

[Dejar visible durante las preguntas. No es necesario leer las referencias.]

---

## Apoyo para preguntas — no forma parte del tiempo del pitch

### ¿Qué representa una tienda en la tabla?

Una tienda equivale a un paquete base vendido e instalado: una ESP32-CAM, dos ESP32-C3 —uno para guía y otro para aforo— y una Raspberry Pi, con los sensores y accesorios presupuestados. No son cuatro ventas independientes. Diez tiendas equivalen a diez paquetes.

### ¿Cómo se calcula el primer mes?

Se supone que todas las instalaciones ocurren ese mes. El primer mes de servicio está incluido; no se cobran además $600.

**Saldo parcial del mes 1 = ($5,000 − $3,310) × tiendas − $900.**

### ¿Cómo se calcula el segundo mes?

Se supone que todas las tiendas continúan y no hay nuevas instalaciones.

**Saldo parcial del mes 2 = $600 × tiendas − $900.**

|Tiendas / paquetes|Cobro inicial|Materiales y montaje|Saldo parcial mes 1|Suscripciones mes 2|Saldo parcial mes 2|
|---|---|---|---|---|---|
|1|$5,000|$3,310|$790|$600|−$300|
|2|$10,000|$6,620|$2,480|$1,200|$300|
|5|$25,000|$16,550|$7,550|$3,000|$2,100|
|10|$50,000|$33,100|$16,000|$6,000|$5,100|

Todos los importes están en MXN. Los saldos descuentan la nube base de $900 una sola vez por mes, compartida entre las tiendas. El montaje se descuenta únicamente en el mes de instalación.

### ¿De dónde salen los $900?

Es un presupuesto ilustrativo: Railway Pro, USD $20, más Supabase Pro, USD $25, multiplicados por un tipo de cambio de planeación de $20 MXN por dólar. No es una factura real ni garantiza capacidad para cualquier cantidad de tiendas. No incluye InfluxDB ni excedentes.

### ¿Cuántas tiendas necesito para obtener ganancias?

Con los costos incluidos en la tabla, una instalación deja saldo positivo en el primer mes y dos suscripciones dejan saldo positivo mensual desde el segundo. **No equivalen al punto de equilibrio completo:** para calcular la ganancia neta faltan los demás gastos, que también pueden aumentar al atender más tiendas.

Por ejemplo, con dos tiendas quedan $300 después de la nube base en el segundo mes. Si los demás gastos superan $300, ese mes tendría pérdida.

### ¿Los $16,000 del primer mes son mi ganancia?

Son el saldo después de pagar materiales, mano de obra y nube base. Todavía deben descontarse los gastos no incluidos. La mano de obra presupuestada de $1,000 por instalación ya está dentro del costo de montaje; no debe restarse nuevamente por el mismo trabajo.

### ¿Los precios incluyen impuestos?

El escenario no define todavía el tratamiento de IVA. No presentar estos montos como utilidad después de impuestos ni como una cotización fiscal definitiva.

### Fuentes de respaldo de la presentación

- INEGI. (2025, 24 de julio). _Censos Económicos 2024. Reporte de resultados 22/25_, versión corregida, pp. 7–8. [https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2025/ce/CE2024_def_RR.pdf](https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2025/ce/CE2024_def_RR.pdf)
- GS1 México. (s. f.). _Desabasto Cero_. [https://www.gs1mexico.org/desabasto-cero](https://www.gs1mexico.org/desabasto-cero)
- Loyverse. (s. f.). _Loyverse POS — Point of Sale Features_. [https://loyverse.com/features](https://loyverse.com/features)
- Focal Systems. (s. f.). _AI Shelf Cameras: 24/7 Shelf Monitoring_. [https://focal.systems/shelf-cameras/](https://focal.systems/shelf-cameras/)
- V-Count. (s. f.). _Nano AI People Counting Sensor_. [https://v-count.com/nano-ai-people-counting-sensor/](https://v-count.com/nano-ai-people-counting-sensor/)
- Railway. (s. f.). _Pricing Plans_. [https://docs.railway.com/pricing/plans](https://docs.railway.com/pricing/plans)
- Supabase. (s. f.). _Pricing & Fees_. [https://supabase.com/pricing](https://supabase.com/pricing)
- InfluxData. (s. f.). _InfluxDB Pricing_. [https://www.influxdata.com/influxdb-pricing/](https://www.influxdata.com/influxdb-pricing/)
- García Chávez, E. (2026). _Presupuesto de materiales e instalación de SelfIQ_ [Presupuesto de trabajo no publicado].

Las fuentes web se consultaron para la presentación el 3 de noviembre de 2026. Los precios comerciales de SelfIQ y el tipo de cambio son supuestos internos de planeación.
