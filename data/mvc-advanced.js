/* ASP.NET MVC — Advanced. 30 questions. See data/manifest.js for the guide. */
QL.register({
  id: "mvc-advanced",
  topic: "ASP.NET MVC",
  level: "Advanced",
  short: "MVC Advanced",
  accent: "blue",
  desc: "Extending the framework itself: custom binders, view engines, filters and factories, plus security, localisation, OWIN, SignalR and performance work.",
  questions: [

    {
      id: "custom-view-engine",
      q: "How do you implement a custom view engine in ASP.NET MVC?",
      tldr: "Derive from VirtualPathProviderViewEngine (or implement IViewEngine) to change where views are found, and register it in ViewEngines.Engines at startup.",
      tags: ["views", "extensibility"],
      a: [
        { p: "In practice you almost never write a view engine from scratch. What you normally want is to **change the view location conventions**, and `VirtualPathProviderViewEngine` exists exactly for that." },
        { code: `public class ThemedViewEngine : RazorViewEngine
{
    public ThemedViewEngine(string theme)
    {
        var t = theme;

        ViewLocationFormats = new[]
        {
            "~/Themes/" + t + "/Views/{1}/{0}.cshtml",
            "~/Themes/" + t + "/Views/Shared/{0}.cshtml",
            "~/Views/{1}/{0}.cshtml",              // fall back to the default
            "~/Views/Shared/{0}.cshtml"
        };

        PartialViewLocationFormats = ViewLocationFormats;
        MasterLocationFormats = ViewLocationFormats;
        FileExtensions = new[] { "cshtml" };
    }
}

// Application_Start
ViewEngines.Engines.Clear();                      // drop WebForms + default Razor
ViewEngines.Engines.Add(new ThemedViewEngine("dark"));
ViewEngines.Engines.Add(new RazorViewEngine());   // keep the standard as backup`, lang: "csharp" },
        { ul: [
          "`{0}` is the view name, `{1}` the controller, `{2}` the area.",
          "`ViewEngines.Engines` is an ordered collection — the **first engine that finds the view wins**.",
          "**`ViewEngines.Engines.Clear()`** on its own is a worthwhile micro-optimisation in MVC 5: it removes the WebForms engine, which otherwise probes for `.aspx`/`.ascx` on every miss.",
          "A full `IViewEngine` implementation returns a `ViewEngineResult` and an `IView` that renders to a `TextWriter` — that is what you need for a genuinely different template language.",
          "View location results are cached, so a custom engine should honour `ViewLocationCache`."
        ] }
      ]
    },

    {
      id: "icontrollerfactory",
      q: "What is the purpose of the IControllerFactory interface?",
      tldr: "It is the extensibility point that creates controller instances for a request — historically the hook for dependency injection, before IDependencyResolver existed.",
      tags: ["extensibility", "di"],
      a: [
        { ul: [
          "Three members: `CreateController`, `GetControllerSessionBehavior` and `ReleaseController`.",
          "The default is `DefaultControllerFactory`, which finds the type by name convention and activates it.",
          "**Its historical use is DI** — overriding it so controllers are resolved from a container rather than needing a parameterless constructor.",
          "`ReleaseController` matters: it is where per-request container scopes are disposed.",
          "Register with `ControllerBuilder.Current.SetControllerFactory(...)`."
        ] },
        { code: `public class ContainerControllerFactory : DefaultControllerFactory
{
    private readonly IContainer _container;
    public ContainerControllerFactory(IContainer container) => _container = container;

    protected override IController GetControllerInstance(
        RequestContext context, Type controllerType)
    {
        if (controllerType == null)
            throw new HttpException(404,
                $"No controller for {context.HttpContext.Request.Path}");

        return (IController)_container.Resolve(controllerType);
    }

    public override void ReleaseController(IController controller)
    {
        (controller as IDisposable)?.Dispose();
        _container.Release(controller);
    }
}

// Application_Start
ControllerBuilder.Current.SetControllerFactory(
    new ContainerControllerFactory(container));`, lang: "csharp" },
        { note: "For DI, prefer **`IDependencyResolver`** (`DependencyResolver.SetResolver`) — it is simpler and also covers filters, view engines and model binders, not just controllers. A custom factory is for when you need to control controller *selection* itself.", kind: "tip" }
      ]
    },

    {
      id: "custom-model-binder",
      q: "How do you implement a custom model binder in ASP.NET MVC?",
      tldr: "Implement IModelBinder (or derive from DefaultModelBinder), build the model from the ValueProvider, and register it globally or with [ModelBinder] on the parameter.",
      tags: ["binding", "extensibility"],
      a: [
        { p: "Use one when the default convention cannot express the mapping — a comma-separated list into a collection, a composite value split across fields, or a value pulled from a header or the current user." },
        { code: `public class DateRangeModelBinder : IModelBinder
{
    public object BindModel(ControllerContext controllerContext,
                            ModelBindingContext bindingContext)
    {
        var values = bindingContext.ValueProvider;
        var from = values.GetValue(bindingContext.ModelName + ".From");
        var to   = values.GetValue(bindingContext.ModelName + ".To");

        if (from == null || to == null) return null;

        if (!DateTime.TryParse(from.AttemptedValue, out var start))
        {
            bindingContext.ModelState.AddModelError(
                bindingContext.ModelName + ".From", "Invalid start date.");
            return null;
        }

        DateTime.TryParse(to.AttemptedValue, out var end);

        if (end < start)
            bindingContext.ModelState.AddModelError(
                bindingContext.ModelName, "End must be after start.");

        return new DateRange(start, end);
    }
}`, lang: "csharp" },
        { code: `// Register globally
ModelBinders.Binders.Add(typeof(DateRange), new DateRangeModelBinder());

// Or per parameter
public ActionResult Report(
    [ModelBinder(typeof(DateRangeModelBinder))] DateRange range) => View(range);

// Or per type
[ModelBinder(typeof(DateRangeModelBinder))]
public class DateRange { ... }`, lang: "csharp" },
        { ul: [
          "The **value providers** are consulted in order: child actions, form, route data, query string, then uploaded files.",
          "Always report failures through **`bindingContext.ModelState`** so validation and redisplay still work.",
          "Deriving from **`DefaultModelBinder`** and overriding just `BindProperty` or `OnModelUpdated` is easier when you only need to adjust part of the default behaviour.",
          "In **ASP.NET Core** the equivalent is `IModelBinder` plus an `IModelBinderProvider`, registered in `MvcOptions.ModelBinderProviders`."
        ] }
      ]
    },

    {
      id: "inversion-of-control",
      q: "Explain the concept of Inversion of Control (IoC) in ASP.NET MVC.",
      tldr: "IoC means the framework, not your class, decides how dependencies are created and supplied; dependency injection is the usual implementation, wired in via IDependencyResolver.",
      tags: ["di", "architecture"],
      seeAlso: ["mvc-intermediate/dependency-injection"],
      a: [
        { p: "**IoC is the principle**: control over creating and locating collaborators is inverted — handed to something outside the class. **DI is the pattern** that implements it, and a **container** is the tool that automates the DI." },
        { code: `// Without IoC — the controller controls its own dependencies
public class OrdersController : Controller
{
    private readonly OrderService _service = new OrderService(
        new SqlOrderRepository(new SqlConnection("...")));   // untestable, welded
}

// With IoC — the container decides, the controller just declares a need
public class OrdersController : Controller
{
    private readonly IOrderService _service;
    public OrdersController(IOrderService service) => _service = service;
}`, lang: "csharp" },
        { code: `public class UnityDependencyResolver : IDependencyResolver
{
    private readonly IUnityContainer _container;
    public UnityDependencyResolver(IUnityContainer c) => _container = c;

    public object GetService(Type type)
        => _container.IsRegistered(type) ? _container.Resolve(type) : null;

    public IEnumerable<object> GetServices(Type type)
        => _container.ResolveAll(type);
}

DependencyResolver.SetResolver(new UnityDependencyResolver(container));`, lang: "csharp" },
        { ul: [
          "**Benefits**: testability (inject a fake), swappable implementations, single place to configure lifetimes, and dependencies become explicit in the constructor signature.",
          "`IDependencyResolver` is broader than `IControllerFactory` — MVC uses it for filters, view engines, model binders and validators as well as controllers.",
          "**Avoid the Service Locator anti-pattern** (`DependencyResolver.Current.GetService<T>()` inside a class) — it hides dependencies and makes testing hard again.",
          "**ASP.NET Core** has a container built in, so no resolver adapter is needed."
        ] }
      ]
    },

    {
      id: "optimize-performance",
      q: "How do you optimize the performance of an ASP.NET MVC application?",
      tldr: "Profile first, then fix data access, add caching, cut the payload, make I/O async, and trim the pipeline — in that order of likely impact.",
      tags: ["performance"],
      a: [
        { table: { head: ["Area", "Action"], rows: [
          ["**Data access**", "Kill N+1 queries (`Include`/projection), add indexes, `AsNoTracking()`, page results, avoid `SELECT *`"],
          ["**Caching**", "Output cache for stable pages, data cache for expensive objects, distributed cache in a farm"],
          ["**Async**", "`async`/`await` for all I/O so threads are not parked"],
          ["**Payload**", "Bundling and minification, compression, image sizing, a CDN for static files"],
          ["**Pipeline**", "`ViewEngines.Engines.Clear()` then add only Razor; remove unused HTTP modules; `runAllManagedModulesForAllRequests=false`"],
          ["**Views**", "Avoid heavy logic in views; prefer `RenderPartial` over `Partial` in loops"],
          ["**Config**", "`<compilation debug=\"false\">` in production — this one is often the biggest single win"],
          ["**Startup**", "Precompile views, enable Application Initialization to avoid cold-start latency"]
        ] } },
        { code: `// The most common EF fix: one query instead of 51
var model = _db.Orders
    .AsNoTracking()
    .Include(o => o.Customer)
    .Where(o => o.CreatedOn >= from)
    .OrderByDescending(o => o.CreatedOn)
    .Skip((page - 1) * size).Take(size)          // always page
    .Select(o => new OrderListItem                // only the columns needed
    {
        Id = o.Id, Reference = o.Reference, Customer = o.Customer.Name
    })
    .ToList();`, lang: "csharp" },
        { code: `<system.web>
  <compilation debug="false" targetFramework="4.8" />
</system.web>
<system.webServer>
  <urlCompression doDynamicCompression="true" doStaticCompression="true" />
  <modules runAllManagedModulesForAllRequests="false" />
  <httpProtocol>
    <customHeaders>
      <remove name="X-Powered-By" />
    </customHeaders>
  </httpProtocol>
</system.webServer>`, lang: "xml" },
        { note: "Leaving `debug=\"true\"` in production disables JIT optimisation, disables bundling/minification, disables request timeouts and prevents batch compilation. It is the single most common production performance bug in ASP.NET.", kind: "warn" }
      ]
    },

    {
      id: "controllercontext",
      q: "What is the purpose of the ControllerContext class?",
      tldr: "It bundles everything about the current request that a controller, filter, view engine or model binder needs — HttpContext, RouteData, the controller instance and RequestContext.",
      tags: ["internals"],
      a: [
        { table: { head: ["Member", "Gives you"], rows: [
          ["`HttpContext`", "Request, Response, Session, User, Items, Server"],
          ["`RouteData`", "Matched route values — controller, action, custom tokens"],
          ["`Controller`", "The controller instance itself"],
          ["`RequestContext`", "`HttpContext` + `RouteData` together"],
          ["`IsChildAction`", "Whether this is a child action (`RenderAction`)"],
          ["`ParentActionViewContext`", "The parent's context, for a child action"]
        ] } },
        { code: `public class AuditFilter : ActionFilterAttribute
{
    public override void OnActionExecuting(ActionExecutingContext filterContext)
    {
        // ActionExecutingContext derives from ControllerContext
        var ctx = filterContext;

        var controller = ctx.RouteData.Values["controller"];
        var action     = ctx.RouteData.Values["action"];
        var user       = ctx.HttpContext.User.Identity.Name;
        var ip         = ctx.HttpContext.Request.UserHostAddress;
        var isChild    = ctx.IsChildAction;

        Audit.Write(user, $"{controller}/{action}", ip);
    }
}`, lang: "csharp" },
        { ul: [
          "`ActionExecutingContext`, `ResultExecutingContext`, `ExceptionContext` and `ViewContext` all **derive from `ControllerContext`**, which is why filters have access to all of this.",
          "`ViewContext` adds `ViewData`, `TempData` and the `TextWriter` the view renders into.",
          "Depending on it directly makes a class hard to unit test — everything on it is `HttpContextBase`, which is at least mockable.",
          "In **ASP.NET Core** the equivalents are `ActionContext` and `HttpContext`, both injectable."
        ] }
      ]
    },

    {
      id: "xss",
      q: "How do you handle cross-site scripting (XSS) in ASP.NET MVC?",
      tldr: "Razor HTML-encodes output by default; the job is to never bypass it with Html.Raw on untrusted input, and to encode correctly for each context — HTML, attribute, JavaScript and URL.",
      tags: ["security"],
      a: [
        { p: "XSS is executing attacker-supplied script in another user's browser. It comes in three flavours: **stored** (saved in the database and served to everyone), **reflected** (echoed back from the request), and **DOM-based** (the client-side JavaScript inserts it)." },
        { code: `@* Safe — Razor HTML-encodes automatically *@
<p>@Model.Comment</p>          @* <script> becomes &lt;script&gt; *@

@* DANGEROUS — encoding is bypassed *@
<p>@Html.Raw(Model.Comment)</p>

@* Context matters: these need different encoders *@
<div title="@Model.Name">                         @* attribute: Razor handles it *@
<script>var n = @Html.Raw(Json.Encode(Model.Name));</script>   @* JS context *@
<a href="/search?q=@Url.Encode(Model.Query)">                  @* URL context *@`, lang: "razor" },
        { code: `// If HTML really must be allowed, sanitise it with a whitelist library
var clean = new HtmlSanitizer().Sanitize(userHtml);   // Ganss.XSS

// Explicit encoders when building strings in code
var html = HttpUtility.HtmlEncode(value);
var js   = HttpUtility.JavaScriptStringEncode(value);
var url  = HttpUtility.UrlEncode(value);`, lang: "csharp" },
        { ul: [
          "**Razor encodes by default** — that is the primary defence, and `@Html.Raw` is the thing to grep for in a review.",
          "**Encode for the context.** HTML encoding inside a `<script>` block or a `href` does not protect you.",
          "**Never build HTML by concatenating** user input; never put untrusted data into a `javascript:` URL or an event attribute.",
          "**Sanitise, do not filter** — blacklists of `<script>` are trivially bypassed. Use a whitelist sanitiser if rich text is a requirement.",
          "Add a **Content-Security-Policy** header as defence in depth, and `HttpOnly` on the auth cookie so a successful XSS cannot steal it.",
          "`[ValidateInput(false)]` and `<httpRuntime requestValidationMode>` disable ASP.NET's crude request validation — if you must, disable it per-property with `[AllowHtml]`, never site-wide."
        ] },
        { note: "Request validation is not an XSS defence — it is a blunt safety net that rejects anything looking like markup. Correct output encoding is the actual defence.", kind: "warn" }
      ]
    },

    {
      id: "custom-action-filter",
      q: "How do you create a custom Action Filter in ASP.NET MVC?",
      tldr: "Derive from ActionFilterAttribute and override OnActionExecuting/Executed or OnResultExecuting/Executed, then apply it at action, controller or global scope.",
      tags: ["filters", "extensibility"],
      seeAlso: ["mvc-intermediate/filters", "mvc-basic/action-filters"],
      a: [
        { code: `public class ValidateModelAttribute : ActionFilterAttribute
{
    public override void OnActionExecuting(ActionExecutingContext filterContext)
    {
        if (filterContext.Controller.ViewData.ModelState.IsValid) return;

        // Short-circuit: the action never runs
        if (filterContext.HttpContext.Request.IsAjaxRequest())
        {
            filterContext.HttpContext.Response.StatusCode = 400;
            filterContext.Result = new JsonResult
            {
                Data = new
                {
                    errors = filterContext.Controller.ViewData.ModelState
                        .Where(e => e.Value.Errors.Any())
                        .ToDictionary(e => e.Key,
                                      e => e.Value.Errors
                                            .Select(x => x.ErrorMessage).ToArray())
                },
                JsonRequestBehavior = JsonRequestBehavior.AllowGet
            };
        }
    }
}

[HttpPost, ValidateModel]
public ActionResult Save(ProductViewModel model)
{
    // ModelState is guaranteed valid here
    return Json(new { id = _service.Save(model) });
}`, lang: "csharp" },
        { ul: [
          "Four overridable hooks: `OnActionExecuting`, `OnActionExecuted`, `OnResultExecuting`, `OnResultExecuted`.",
          "Setting **`filterContext.Result`** in `OnActionExecuting` short-circuits — the action is skipped and that result is executed.",
          "Pass state between hooks via **`HttpContext.Items`**, never an instance field: filter attribute instances are **cached and reused across requests**, so instance state is a race condition.",
          "Scope order in is global → controller → action; out is the reverse. `Order` overrides it.",
          "Attributes cannot take constructor-injected services in MVC 5. Use property injection through `IDependencyResolver`, or `DependencyResolver.Current` inside the method."
        ] },
        { note: "The instance-state trap is the point most candidates miss: a `private Stopwatch _sw;` field on a filter attribute is shared across concurrent requests. Use `HttpContext.Items`.", kind: "warn" }
      ]
    },

    {
      id: "iactioninvoker",
      q: "Explain the purpose of the IActionInvoker interface.",
      tldr: "It is the component that finds the right action method, runs the filter pipeline, performs model binding, invokes the action and executes the result.",
      tags: ["internals", "extensibility"],
      a: [
        { p: "The controller does not invoke its own action — it delegates to `ControllerActionInvoker` (or `AsyncControllerActionInvoker`), exposed as `Controller.ActionInvoker`." },
        { ol: [
          "**`FindAction`** — the `ControllerDescriptor` and action selectors pick the `ActionDescriptor`.",
          "**`GetFilters`** — collect authorization, action, result and exception filters from all three scopes.",
          "**Authorization filters** run; a failure short-circuits.",
          "**`GetParameterValues`** — model binding fills the parameters.",
          "**Action filters** run, then the action itself, then the after-filters.",
          "**Result filters** run around executing the returned `ActionResult`."
        ] },
        { code: `public class LoggingActionInvoker : ControllerActionInvoker
{
    protected override ActionResult InvokeActionMethod(
        ControllerContext controllerContext,
        ActionDescriptor actionDescriptor,
        IDictionary<string, object> parameters)
    {
        var sw = Stopwatch.StartNew();
        var result = base.InvokeActionMethod(
            controllerContext, actionDescriptor, parameters);
        Logger.Info($"{actionDescriptor.ActionName} {sw.ElapsedMilliseconds} ms");
        return result;
    }
}

public class BaseController : Controller
{
    public BaseController() => ActionInvoker = new LoggingActionInvoker();
}`, lang: "csharp" },
        { note: "Replacing the invoker is a heavy hammer. Almost everything people want it for — timing, logging, custom parameter handling — is better done with a filter or a model binder. Its real value in an interview is showing you know the pipeline.", kind: "tip" }
      ]
    },

    {
      id: "localization-globalization",
      q: "How do you implement localization and globalization in ASP.NET MVC?",
      tldr: "Globalization means designing for any culture; localization means supplying resources per culture. Set the thread's culture per request and pull all text from .resx satellite assemblies.",
      tags: ["i18n"],
      a: [
        { ul: [
          "**Globalization** — culture-aware formatting of dates, numbers and currency, and no hard-coded strings.",
          "**Localization** — translated resources for each culture.",
          "`CultureInfo.CurrentCulture` controls **formatting**; `CurrentUICulture` controls **which resource file is used**. They are separate on purpose.",
          "`.resx` files compile into **satellite assemblies** under `/bin/{culture}/`, resolved automatically with fallback to the neutral resource."
        ] },
        { code: `<system.web>
  <!-- "auto" uses the browser's Accept-Language header -->
  <globalization culture="auto" uiCulture="auto" enableClientBasedCulture="true" />
</system.web>`, lang: "xml" },
        { code: `// Explicit per-request culture, e.g. from a route value or cookie
public class CultureAttribute : ActionFilterAttribute
{
    public override void OnActionExecuting(ActionExecutingContext ctx)
    {
        var lang = (string)ctx.RouteData.Values["lang"]
                   ?? ctx.HttpContext.Request.Cookies["lang"]?.Value
                   ?? "en";

        var culture = new CultureInfo(lang);
        Thread.CurrentThread.CurrentCulture = culture;     // formatting
        Thread.CurrentThread.CurrentUICulture = culture;   // resources
    }
}

// Route: /en/Products/Index, /fr/Products/Index
routes.MapRoute("Localized", "{lang}/{controller}/{action}/{id}",
    new { controller = "Home", action = "Index", id = UrlParameter.Optional },
    new { lang = "[a-z]{2}" });`, lang: "csharp" },
        { code: `@* Resources.resx / Resources.fr.resx, marked Public in the designer *@
<h2>@Resources.WelcomeMessage</h2>
<p>@Model.Price.ToString("C")</p>        @* culture-aware currency *@
<p>@Model.Date.ToString("d")</p>         @* culture-aware short date *@`, lang: "razor" },
        { code: `public class ProductViewModel
{
    [Required(ErrorMessageResourceType = typeof(Resources),
              ErrorMessageResourceName = "NameRequired")]
    [Display(ResourceType = typeof(Resources), Name = "ProductName")]
    public string Name { get; set; }
}`, lang: "csharp", caption: "Localised validation messages and labels" },
        { note: "Two traps: use **`InvariantCulture` for anything persisted or sent over the wire** (dates in URLs, decimals in JSON), otherwise a French server writes `1,5` and a US one reads it as 15. And remember right-to-left languages need layout changes, not just translated strings.", kind: "warn" }
      ]
    },

    {
      id: "complex-form-submissions",
      q: "How do you handle complex form submissions in ASP.NET MVC?",
      tldr: "Rely on the model binder's naming conventions — dotted names for nested objects and indexed names for collections — with a view model shaped to match the form.",
      tags: ["forms", "binding"],
      a: [
        { p: "The binder is convention-driven. Get the `name` attributes right and arbitrarily deep object graphs bind automatically." },
        { table: { head: ["Shape", "Field name the binder expects"], rows: [
          ["Simple property", "`Name`"],
          ["Nested object", "`Address.City`"],
          ["Deeper nesting", "`Order.Customer.Address.City`"],
          ["List, sequential", "`Lines[0].Product`, `Lines[1].Product`"],
          ["List, non-sequential", "`Lines.Index=a` plus `Lines[a].Product`"],
          ["Array of primitives", "`Tags` repeated, or `Tags[0]`, `Tags[1]`"],
          ["Dictionary", "`Meta[0].Key`, `Meta[0].Value`"]
        ] } },
        { code: `public class OrderViewModel
{
    public string Reference { get; set; }
    public AddressViewModel ShippingAddress { get; set; }
    public List<OrderLineViewModel> Lines { get; set; } = new();
}`, lang: "csharp" },
        { code: `@using (Html.BeginForm())
{
    @Html.AntiForgeryToken()
    @Html.TextBoxFor(m => m.Reference)
    @Html.TextBoxFor(m => m.ShippingAddress.City)   @* ShippingAddress.City *@

    @for (var i = 0; i < Model.Lines.Count; i++)
    {
        @* A for loop (not foreach) so the indexer appears in the name *@
        @Html.TextBoxFor(m => m.Lines[i].Product)   @* Lines[0].Product *@
        @Html.TextBoxFor(m => m.Lines[i].Quantity)
    }
    <button type="submit">Save</button>
}`, lang: "razor" },
        { code: `@* Rows added and removed dynamically: non-sequential indices *@
<input type="hidden" name="Lines.Index" value="@guid" />
<input type="text" name="Lines[@guid].Product" />`, lang: "razor" },
        { ul: [
          "Use a **`for` loop, not `foreach`** — `foreach` produces `Lines.Product` with no index and only the last row binds.",
          "The `Lines.Index` hidden field lets indices be arbitrary strings, which is what makes JavaScript-added and removed rows work.",
          "**`[Bind(Include = \"...\")]`** or a purpose-built view model prevents over-posting.",
          "`UpdateModel`/`TryUpdateModel` bind onto an existing instance when you cannot take the model as a parameter."
        ] },
        { note: "`MaxHttpCollectionKeys` defaults to 1000 — a very large dynamic form silently fails to bind past that. Raise `aspnet:MaxHttpCollectionKeys` in `appSettings` if you genuinely need more.", kind: "warn" }
      ]
    },

    {
      id: "iresultfilter",
      q: "What is the purpose of the IResultFilter interface?",
      tldr: "It wraps execution of the ActionResult — OnResultExecuting runs after the action but before the view renders, OnResultExecuted after the response is written.",
      tags: ["filters"],
      seeAlso: ["mvc-intermediate/filters"],
      a: [
        { ul: [
          "Two members: **`OnResultExecuting`** (before the result executes) and **`OnResultExecuted`** (after).",
          "The key distinction from an **action** filter: an action filter runs around the *method*, a result filter runs around *rendering*.",
          "`OnResultExecuting` is the **last point at which you can still set response headers** — after the view starts writing, the headers are already sent.",
          "Setting `filterContext.Cancel = true` in `OnResultExecuting` prevents the result executing at all.",
          "`[OutputCache]` is the built-in example — it must sit around rendering to capture the output."
        ] },
        { code: `public class SecurityHeadersAttribute : FilterAttribute, IResultFilter
{
    public void OnResultExecuting(ResultExecutingContext filterContext)
    {
        // Must be here — too late once the view has begun writing
        var headers = filterContext.HttpContext.Response.Headers;
        headers["X-Content-Type-Options"] = "nosniff";
        headers["X-Frame-Options"] = "DENY";
        headers["Referrer-Policy"] = "no-referrer";
    }

    public void OnResultExecuted(ResultExecutedContext filterContext)
    {
        if (filterContext.Exception != null && !filterContext.ExceptionHandled)
            Logger.Error(filterContext.Exception, "Result execution failed");
    }
}`, lang: "csharp" },
        { code: `Action filter   OnActionExecuting
    ACTION RUNS
Action filter   OnActionExecuted
Result filter   OnResultExecuting     <- last chance for headers
    RESULT EXECUTES (view renders)
Result filter   OnResultExecuted`, lang: "text", caption: "Where result filters sit" }
      ]
    },

    {
      id: "custom-error-handling",
      q: "How do you implement custom error handling in ASP.NET MVC?",
      tldr: "Combine a global exception filter that logs and returns a friendly result, an ErrorController for status codes, Application_Error as backstop, and customErrors/httpErrors config.",
      tags: ["errors"],
      seeAlso: ["mvc-intermediate/handle-exceptions", "mvc-basic/error-handling"],
      a: [
        { code: `public class ErrorController : Controller
{
    public ActionResult Index()      { Response.StatusCode = 500; return View(); }
    public ActionResult NotFound()   { Response.StatusCode = 404; return View(); }
    public ActionResult Forbidden()  { Response.StatusCode = 403; return View(); }
}`, lang: "csharp" },
        { code: `protected void Application_Error()
{
    var ex = Server.GetLastError();
    Logger.Error(ex, "Unhandled: {0}", Request.Url);

    var http = ex as HttpException;
    var code = http?.GetHttpCode() ?? 500;

    Server.ClearError();
    Response.Clear();
    Response.StatusCode = code;
    Response.TrySkipIisCustomErrors = true;

    var action = code == 404 ? "NotFound" : code == 403 ? "Forbidden" : "Index";

    var routes = new RouteData();
    routes.Values["controller"] = "Error";
    routes.Values["action"] = action;

    IController controller = new ErrorController();
    controller.Execute(new RequestContext(
        new HttpContextWrapper(Context), routes));
}`, lang: "csharp" },
        { code: `<system.web>
  <customErrors mode="RemoteOnly" defaultRedirect="~/Error">
    <error statusCode="404" redirect="~/Error/NotFound" />
  </customErrors>
</system.web>
<system.webServer>
  <httpErrors errorMode="Custom" existingResponse="Replace">
    <remove statusCode="404" />
    <error statusCode="404" path="/Error/NotFound" responseMode="ExecuteURL" />
  </httpErrors>
</system.webServer>`, lang: "xml" },
        { ul: [
          "**`customErrors`** handles errors raised inside ASP.NET; **`httpErrors`** handles IIS-level ones such as a request that never reaches managed code. Configure both.",
          "**`TrySkipIisCustomErrors = true`** or IIS overwrites your carefully built error page.",
          "Return the **correct status code** — a 404 page served with 200 confuses crawlers and monitoring.",
          "**Never show exception details in production**: `mode=\"RemoteOnly\"` at minimum, ideally `\"On\"`.",
          "Handle **AJAX separately** — return JSON with a status code, not an HTML error page."
        ] }
      ]
    },

    {
      id: "modelmetadataprovider",
      q: "What is the purpose of the ModelMetadataProvider class?",
      tldr: "It produces the ModelMetadata that describes each model property — display name, format, required-ness, template hint — which the HTML helpers and validators then consume.",
      tags: ["internals", "views"],
      a: [
        { ul: [
          "`ModelMetadata` is what `DisplayFor`/`EditorFor`/`LabelFor` read to decide the label, the format and which template to use.",
          "The default is `DataAnnotationsModelMetadataProvider`, which reads `[Display]`, `[DisplayFormat]`, `[Required]`, `[UIHint]`, `[DataType]` and friends.",
          "Override it to apply **conventions across the whole app** without annotating every property.",
          "Register with `ModelMetadataProviders.Current = new MyProvider();`."
        ] },
        { code: `public class ConventionMetadataProvider : DataAnnotationsModelMetadataProvider
{
    protected override ModelMetadata CreateMetadata(
        IEnumerable<Attribute> attributes,
        Type containerType,
        Func<object> modelAccessor,
        Type modelType,
        string propertyName)
    {
        var metadata = base.CreateMetadata(attributes, containerType,
                                           modelAccessor, modelType, propertyName);

        // Convention: "UnitPrice" -> "Unit Price" when no [Display] is present
        if (metadata.DisplayName == null && propertyName != null)
            metadata.DisplayName = Regex.Replace(propertyName,
                "([a-z])([A-Z])", "$1 $2");

        // Convention: every decimal shows as currency
        if (modelType == typeof(decimal) && metadata.DisplayFormatString == null)
            metadata.DisplayFormatString = "{0:C}";

        return metadata;
    }
}

// Application_Start
ModelMetadataProviders.Current = new ConventionMetadataProvider();`, lang: "csharp" },
        { note: "It is metadata **only** — it drives display and template selection. Validation rules come from `ModelValidatorProviders`, which is a separate extensibility point that happens to read the same attributes.", kind: "tip" }
      ]
    },

    {
      id: "http-modules-handlers",
      q: "How do you handle HTTP modules and handlers in ASP.NET MVC?",
      tldr: "A module hooks pipeline events for every request (cross-cutting), a handler produces the response for a specific request (an endpoint). MVC itself is registered as a handler.",
      tags: ["internals", "pipeline"],
      a: [
        { table: { head: ["", "HTTP Module", "HTTP Handler"], rows: [
          ["Implements", "`IHttpModule`", "`IHttpHandler` / `IHttpAsyncHandler`"],
          ["Runs for", "**Every** request", "Requests matching a path or extension"],
          ["Purpose", "Cross-cutting — logging, auth, headers, compression", "Produce the response — the endpoint itself"],
          ["Count per request", "Many", "Exactly one"],
          ["MVC analogue", "Global filter / middleware", "The MVC handler that runs the action"]
        ] } },
        { code: `public class RequestTimingModule : IHttpModule
{
    public void Init(HttpApplication app)
    {
        app.BeginRequest += (s, e) =>
            HttpContext.Current.Items["start"] = Stopwatch.StartNew();

        app.EndRequest += (s, e) =>
        {
            var sw = (Stopwatch)HttpContext.Current.Items["start"];
            Logger.Info($"{HttpContext.Current.Request.Path} {sw.ElapsedMilliseconds} ms");
        };
    }

    public void Dispose() { }
}

public class HealthHandler : IHttpHandler
{
    public bool IsReusable => true;

    public void ProcessRequest(HttpContext context)
    {
        context.Response.ContentType = "text/plain";
        context.Response.Write("OK");
    }
}`, lang: "csharp" },
        { code: `<system.webServer>
  <modules>
    <add name="RequestTiming" type="Shop.RequestTimingModule" />
  </modules>
  <handlers>
    <add name="Health" path="health" verb="GET"
         type="Shop.HealthHandler" resourceType="Unspecified" />
  </handlers>
</system.webServer>`, lang: "xml" },
        { ul: [
          "`UrlRoutingModule` is itself a module — it is how routing intercepts requests before they reach a physical file.",
          "`routes.IgnoreRoute(...)` is how you let a request through routing to reach a custom handler.",
          "`runAllManagedModulesForAllRequests=\"true\"` makes every module run even for static files — turn it **off** for performance.",
          "In **ASP.NET Core** both concepts collapse into **middleware**, and the terminal middleware plays the handler's role."
        ] }
      ]
    },

    {
      id: "custom-route-constraints",
      q: "How do you implement custom route constraints in ASP.NET MVC?",
      tldr: "Implement IRouteConstraint.Match and attach it in the constraints object of MapRoute, or register it by name for use in attribute routing.",
      tags: ["routing", "extensibility"],
      seeAlso: ["mvc-basic/custom-route", "mvc-intermediate/attribute-routing"],
      a: [
        { code: `public class EnumConstraint<TEnum> : IRouteConstraint where TEnum : struct
{
    public bool Match(HttpContextBase httpContext, Route route,
                      string parameterName, RouteValueDictionary values,
                      RouteDirection routeDirection)
    {
        if (!values.TryGetValue(parameterName, out var value) || value == null)
            return false;

        return Enum.TryParse<TEnum>(value.ToString(), ignoreCase: true, out _);
    }
}

public class LocalOnlyConstraint : IRouteConstraint
{
    public bool Match(HttpContextBase httpContext, Route route,
                      string parameterName, RouteValueDictionary values,
                      RouteDirection routeDirection)
        => httpContext.Request.IsLocal;
}`, lang: "csharp" },
        { code: `routes.MapRoute(
    name: "ByStatus",
    url: "orders/{status}",
    defaults: new { controller = "Orders", action = "ByStatus" },
    constraints: new { status = new EnumConstraint<OrderStatus>() }
);

routes.MapRoute(
    name: "Diagnostics",
    url: "diag/{action}",
    defaults: new { controller = "Diagnostics" },
    constraints: new { local = new LocalOnlyConstraint() }   // dev machine only
);`, lang: "csharp" },
        { code: `// Named constraint, usable in attribute routing as {status:orderstatus}
public class CustomConstraintResolver : DefaultInlineConstraintResolver
{
    public CustomConstraintResolver()
        => ConstraintMap.Add("orderstatus", typeof(EnumConstraint<OrderStatus>));
}

routes.MapMvcAttributeRoutes(new CustomConstraintResolver());

[Route("orders/{status:orderstatus}")]
public ActionResult ByStatus(OrderStatus status) => View();`, lang: "csharp" },
        { ul: [
          "`RouteDirection` tells you whether this is **incoming URL matching** or **outgoing URL generation** — you often want to accept more freely when generating.",
          "Returning `false` means the route does not match, and routing moves on to the next one — it is **not** an error.",
          "Constraints run on every candidate route, so keep them cheap. **No database calls.**",
          "A constraint is for **routing**, not authorisation — use a filter for access control."
        ] }
      ]
    },

    {
      id: "dynamic-content-generation",
      q: "Explain the concept of dynamic content generation in ASP.NET MVC.",
      tldr: "Producing the response at request time from data and logic rather than serving a static file — Razor rendering a model, but equally JSON, PDFs, CSVs, images and sitemaps built on the fly.",
      tags: ["views", "architecture"],
      a: [
        { ul: [
          "**Razor views** — the standard case: model plus template rendered to HTML per request.",
          "**Dynamic result types** — build CSV, PDF, XML or an image in a custom `ActionResult`.",
          "**Rendering a view to a string** — for emails, or to return HTML from an API.",
          "**Runtime-compiled Razor** (RazorEngine, RazorLight) — for templates stored in a database and edited by users.",
          "**Dynamic models** — `ExpandoObject` or `dynamic` when the shape is not known at compile time."
        ] },
        { code: `// Render a view to a string, e.g. for an email body
public static string RenderView(Controller controller, string viewName, object model)
{
    controller.ViewData.Model = model;

    using var sw = new StringWriter();
    var result = ViewEngines.Engines.FindPartialView(
        controller.ControllerContext, viewName);

    var context = new ViewContext(controller.ControllerContext, result.View,
                                  controller.ViewData, controller.TempData, sw);

    result.View.Render(context, sw);
    result.ViewEngine.ReleaseView(controller.ControllerContext, result.View);
    return sw.GetStringBuilder().ToString();
}`, lang: "csharp" },
        { code: `// A dynamically generated sitemap
public ActionResult Sitemap()
{
    var xml = new XDocument(
        new XElement("urlset",
            _repo.PublishedProducts().Select(p =>
                new XElement("url",
                    new XElement("loc", Url.Action("Details", "Products",
                                                   new { id = p.Id }, "https")),
                    new XElement("lastmod", p.UpdatedOn.ToString("yyyy-MM-dd"))))));

    return Content(xml.ToString(), "application/xml");
}`, lang: "csharp" },
        { note: "The trade-off worth naming: dynamic content costs CPU and database time on **every** request. Output caching, `ETag`/`Last-Modified` headers, or pre-generating to a static file are the mitigations.", kind: "tip" }
      ]
    },

    {
      id: "signalr",
      q: "How do you use SignalR with ASP.NET MVC?",
      tldr: "Add the SignalR package, define a Hub with server methods, map it in OWIN startup, and connect from the client — SignalR negotiates WebSockets with fallbacks automatically.",
      tags: ["realtime"],
      a: [
        { code: `public class NotificationHub : Hub
{
    // Callable from the client
    public async Task Send(string room, string message)
        => await Clients.Group(room).broadcast(Context.User.Identity.Name, message);

    public override Task OnConnected()
    {
        Groups.Add(Context.ConnectionId, "all");
        return base.OnConnected();
    }

    public override Task OnDisconnected(bool stopCalled)
        => base.OnDisconnected(stopCalled);
}`, lang: "csharp" },
        { code: `// OWIN startup
[assembly: OwinStartup(typeof(Shop.Startup))]
public class Startup
{
    public void Configuration(IAppBuilder app) => app.MapSignalR();
}

// Pushing from a controller or a background job
var hub = GlobalHost.ConnectionManager.GetHubContext<NotificationHub>();
hub.Clients.Group("all").broadcast("system", "Order shipped");`, lang: "csharp" },
        { code: `<script src="~/Scripts/jquery.signalR-2.4.3.min.js"></script>
<script src="~/signalr/hubs"></script>
<script>
    var hub = $.connection.notificationHub;

    hub.client.broadcast = function (user, message) {
        $('#messages').append('<li>' + user + ': ' + message + '</li>');
    };

    $.connection.hub.start().done(function () {
        hub.server.send('all', 'hello');
    });
</script>`, lang: "razor" },
        { ul: [
          "**Transports**, tried in order: WebSockets, Server-Sent Events, Forever Frame, Long Polling. The negotiation is automatic.",
          "**`Clients`** targets recipients: `All`, `Caller`, `Others`, `Client(id)`, `Group(name)`, `User(name)`.",
          "Use it for **live dashboards, notifications, chat, progress reporting** — anything the server must push.",
          "In a **web farm** you need a backplane (Redis, SQL Server, Service Bus) so a message published on one node reaches clients connected to another.",
          "`[Authorize]` works on hubs and hub methods."
        ] },
        { note: "ASP.NET Core SignalR is a rewrite: no jQuery dependency, `@microsoft/signalr` on the client, `MessagePack` support, and hubs mapped with `app.MapHub<T>(\"/hub\")`.", kind: "tip" }
      ]
    },

    {
      id: "childactiononly",
      q: "What is the purpose of the ChildActionOnly attribute?",
      tldr: "It restricts an action so it can only be invoked from within a view via Html.Action/RenderAction — a direct URL request returns an error.",
      tags: ["views", "security"],
      seeAlso: ["mvc-intermediate/html-renderaction"],
      a: [
        { ul: [
          "Without it, an action returning a partial view is reachable by URL and will render a **layout-less fragment** to anyone who asks.",
          "It exists for page regions — menus, cart summaries, widgets — that only make sense inside a page.",
          "`ControllerContext.IsChildAction` is how the framework distinguishes the two calls.",
          "It is an **encapsulation** measure more than a security boundary: if the fragment contains sensitive data, it still needs `[Authorize]`."
        ] },
        { code: `public class WidgetsController : Controller
{
    [ChildActionOnly]
    [OutputCache(Duration = 300)]
    public ActionResult Navigation()
        => PartialView("_Navigation", _menu.Build(User));

    [ChildActionOnly]
    [Authorize]                              // still needed if it is sensitive
    public ActionResult AccountSummary()
        => PartialView("_AccountSummary", _accounts.For(User.Identity.Name));
}`, lang: "csharp" },
        { code: `@{ Html.RenderAction("Navigation", "Widgets"); }
@Html.Action("AccountSummary", "Widgets")`, lang: "razor" },
        { note: "In **ASP.NET Core**, child actions and `[ChildActionOnly]` no longer exist — **View Components** replace them and are unreachable by URL by design.", kind: "tip" }
      ]
    },

    {
      id: "attribute-based-programming",
      q: "How do you implement attribute-based programming in ASP.NET MVC?",
      tldr: "Use attributes as the declarative surface for cross-cutting behaviour — filters, routes, validation, binding and metadata — so intent sits next to the code it affects.",
      tags: ["architecture", "metadata"],
      a: [
        { table: { head: ["Concern", "Attribute base", "Example"], rows: [
          ["Behaviour around actions", "`ActionFilterAttribute`", "`[Log]`, `[Transaction]`"],
          ["Access control", "`AuthorizeAttribute`", "`[Authorize(Roles=\"Admin\")]`"],
          ["Error handling", "`HandleErrorAttribute` / `IExceptionFilter`", "`[HandleError]`"],
          ["Routing", "`RouteAttribute`", "`[Route(\"products/{id:int}\")]`"],
          ["Validation", "`ValidationAttribute`", "`[Required]`, `[MinimumAge(18)]`"],
          ["Model binding", "`CustomModelBinderAttribute`", "`[ModelBinder(typeof(X))]`"],
          ["Action selection", "`ActionMethodSelectorAttribute`", "`[HttpPost]`, `[SubmitButton]`"],
          ["Action naming", "`ActionNameSelectorAttribute`", "`[ActionName(\"Delete\")]`"],
          ["Metadata", "`Attribute` + reflection", "`[Display]`, `[Column]`"]
        ] } },
        { code: `public class TransactionAttribute : ActionFilterAttribute
{
    private const string Key = "__tx";

    public override void OnActionExecuting(ActionExecutingContext c)
        => c.HttpContext.Items[Key] = new TransactionScope();

    public override void OnActionExecuted(ActionExecutedContext c)
    {
        var tx = (TransactionScope)c.HttpContext.Items[Key];
        if (c.Exception == null) tx.Complete();     // commit only on success
        tx.Dispose();
    }
}

[HttpPost]
[Authorize(Roles = "Manager")]
[ValidateAntiForgeryToken]
[Transaction]
[Route("orders/{id:int}/approve")]
public ActionResult Approve(int id) { ... }`, lang: "csharp" },
        { ul: [
          "The benefit is **declarative intent**: the action reads as a list of what applies to it, and the mechanics live elsewhere.",
          "It is ASP.NET MVC's built-in flavour of **aspect-oriented programming**.",
          "**Limitation in MVC 5**: attributes cannot take constructor-injected services — use `DependencyResolver` inside the method, or property injection.",
          "**Overuse hurts.** Six attributes on one action makes the actual behaviour hard to reason about; something like a transaction is often clearer as an explicit `using` block."
        ] }
      ]
    },

    {
      id: "multiple-submit-buttons",
      q: "How do you handle multiple submit buttons in ASP.NET MVC?",
      tldr: "Branch on a shared button name/value in one action, or route each button to its own action with a custom ActionNameSelectorAttribute.",
      tags: ["forms"],
      seeAlso: ["mvc-intermediate/multiple-submit-buttons"],
      a: [
        { p: "The advanced answer is the **selector attribute** — it keeps each action focused instead of putting a `switch` at the top of one method." },
        { code: `[AttributeUsage(AttributeTargets.Method, AllowMultiple = false)]
public class SubmitButtonAttribute : ActionNameSelectorAttribute
{
    public string Name { get; set; }
    public string Value { get; set; }

    public override bool IsValidName(ControllerContext controllerContext,
                                     string actionName, MethodInfo methodInfo)
    {
        var form = controllerContext.HttpContext.Request.Form;
        var submitted = form[Name];

        if (submitted == null) return false;
        return Value == null || submitted == Value;
    }
}`, lang: "csharp" },
        { code: `[HttpPost, SubmitButton(Name = "action", Value = "save")]
[ValidateAntiForgeryToken]
public ActionResult Save(OrderViewModel model) { ... }

[HttpPost, SubmitButton(Name = "action", Value = "submit")]
[ValidateAntiForgeryToken]
public ActionResult Submit(OrderViewModel model) { ... }

[HttpPost, SubmitButton(Name = "action", Value = "cancel")]
public ActionResult Cancel() => RedirectToAction("Index");`, lang: "csharp" },
        { code: `@using (Html.BeginForm("Save", "Orders"))   @* any of them: the selector decides *@
{
    @Html.AntiForgeryToken()
    <button type="submit" name="action" value="save">Save draft</button>
    <button type="submit" name="action" value="submit">Submit for approval</button>
    <button type="submit" name="action" value="cancel">Cancel</button>
}`, lang: "razor" },
        { ul: [
          "`ActionNameSelectorAttribute` participates in **action selection**, so the invoker picks the method whose selector returns `true`.",
          "`ActionMethodSelectorAttribute` (which `[HttpPost]` uses) is the sibling for filtering by verb rather than by name.",
          "The `BeginForm` target does not matter much — the selector reroutes to whichever action matches.",
          "Simpler alternative when there are only two buttons: one action taking a `string command` parameter."
        ] }
      ]
    },

    {
      id: "action-selectors",
      q: "Explain the concept of action selectors in ASP.NET MVC.",
      tldr: "Attributes that influence which method the invoker picks for a request — ActionName changes the name, ActionMethodSelector filters candidates, and NonAction removes one entirely.",
      tags: ["controllers", "routing"],
      a: [
        { table: { head: ["Attribute", "Base", "Effect"], rows: [
          ["`[ActionName(\"X\")]`", "`ActionNameSelectorAttribute`", "Changes the name the route matches"],
          ["`[HttpGet]`, `[HttpPost]`, `[HttpPut]`, `[HttpDelete]`", "`ActionMethodSelectorAttribute`", "Only matches that verb"],
          ["`[AcceptVerbs(\"GET\",\"POST\")]`", "`ActionMethodSelectorAttribute`", "Matches several verbs"],
          ["`[NonAction]`", "—", "The method is not an action at all"],
          ["`[RequireHttps]`", "Authorization filter", "Not a selector — redirects instead"],
          ["Custom", "Either base class", "Any rule you like, e.g. which button was pressed"]
        ] } },
        { p: "How selection works:" },
        { ol: [
          "Routing supplies an **action name**.",
          "The `ControllerDescriptor` finds all public methods whose name — or `[ActionName]` — matches.",
          "Every `ActionMethodSelectorAttribute` on each candidate is asked `IsValidForRequest`. Candidates that say no are dropped.",
          "**Exactly one** must remain. Zero gives a 404; more than one throws `AmbiguousMatchException`."
        ] },
        { code: `public class AjaxOnlyAttribute : ActionMethodSelectorAttribute
{
    public override bool IsValidForRequest(ControllerContext controllerContext,
                                           MethodInfo methodInfo)
        => controllerContext.HttpContext.Request.IsAjaxRequest();
}

public class ProductsController : Controller
{
    [AjaxOnly]
    public ActionResult List() => PartialView("_List", _repo.All());

    [ActionName("List")]                 // same URL, chosen when not AJAX
    public ActionResult ListPage() => View(_repo.All());
}`, lang: "csharp" },
        { note: "This is why two overloads of the same action name with different C# signatures fail: overload resolution is a **compiler** concept, and the invoker only sees names plus selectors. Differentiate with `[HttpGet]`/`[HttpPost]` or `[ActionName]`.", kind: "warn" }
      ]
    },

    {
      id: "web-api",
      q: "How do you work with Web API in ASP.NET MVC?",
      tldr: "Web API is a parallel stack for HTTP services: ApiController, its own routing in WebApiConfig, content negotiation and HTTP status semantics rather than views.",
      tags: ["api", "architecture"],
      a: [
        { table: { head: ["", "MVC controller", "Web API controller (MVC 5 era)"], rows: [
          ["Base class", "`Controller`", "`ApiController`"],
          ["Returns", "`ActionResult` — usually a view", "The object, or `IHttpActionResult`"],
          ["Routing config", "`RouteConfig` / `RouteTable`", "`WebApiConfig` / `HttpConfiguration`"],
          ["Action selection", "By action name", "By **HTTP verb** convention"],
          ["Format", "HTML", "**Content negotiation** — JSON or XML from `Accept`"],
          ["Filters", "`System.Web.Mvc`", "`System.Web.Http` — different types, same names"],
          ["Context", "`HttpContext`", "`HttpRequestMessage` — host-independent"]
        ] } },
        { code: `public static class WebApiConfig
{
    public static void Register(HttpConfiguration config)
    {
        config.MapHttpAttributeRoutes();
        config.Routes.MapHttpRoute(
            name: "DefaultApi",
            routeTemplate: "api/{controller}/{id}",
            defaults: new { id = RouteParameter.Optional }
        );
        config.Formatters.Remove(config.Formatters.XmlFormatter);   // JSON only
    }
}

// Global.asax — note this must come before RouteConfig
GlobalConfiguration.Configure(WebApiConfig.Register);`, lang: "csharp" },
        { code: `[RoutePrefix("api/products")]
public class ProductsController : ApiController
{
    [HttpGet, Route("")]
    public IHttpActionResult Get() => Ok(_repo.All());

    [HttpGet, Route("{id:int}")]
    public IHttpActionResult Get(int id)
    {
        var p = _repo.Find(id);
        return p == null ? (IHttpActionResult)NotFound() : Ok(p);
    }

    [HttpPost, Route("")]
    public IHttpActionResult Post(ProductDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var id = _repo.Create(dto);
        return CreatedAtRoute("DefaultApi", new { id }, dto);   // 201 + Location
    }

    [HttpDelete, Route("{id:int}")]
    public IHttpActionResult Delete(int id)
    {
        _repo.Delete(id);
        return StatusCode(HttpStatusCode.NoContent);            // 204
    }
}`, lang: "csharp" },
        { note: "The single most common bug when mixing the two: using the wrong `[Authorize]`. `System.Web.Mvc.AuthorizeAttribute` on an `ApiController` silently does nothing — you need `System.Web.Http.AuthorizeAttribute`. The same applies to every filter type. **ASP.NET Core merges the two stacks**, which removes this whole class of problem.", kind: "warn" }
      ]
    },

    {
      id: "custom-authorization-filter",
      q: "How do you implement a custom authorization filter in ASP.NET MVC?",
      tldr: "Derive from AuthorizeAttribute and override AuthorizeCore for the decision and HandleUnauthorizedRequest for the response — or implement IAuthorizationFilter for full control.",
      tags: ["security", "filters"],
      seeAlso: ["mvc-intermediate/authorize-attribute", "mvc-intermediate/role-based-authorization"],
      a: [
        { code: `public class PermissionAttribute : AuthorizeAttribute
{
    private readonly string _permission;
    public PermissionAttribute(string permission) => _permission = permission;

    protected override bool AuthorizeCore(HttpContextBase httpContext)
    {
        if (!base.AuthorizeCore(httpContext)) return false;   // authenticated?

        var user = httpContext.User.Identity.Name;
        return PermissionService.Has(user, _permission);
    }

    protected override void HandleUnauthorizedRequest(
        AuthorizationContext filterContext)
    {
        if (filterContext.HttpContext.Request.IsAjaxRequest())
        {
            filterContext.Result = new HttpStatusCodeResult(
                HttpStatusCode.Forbidden, "Permission denied");
            return;
        }

        if (filterContext.HttpContext.User.Identity.IsAuthenticated)
        {
            // Authenticated but not permitted -> 403, not the login page
            filterContext.Result = new RedirectToRouteResult(
                new RouteValueDictionary(new { controller = "Error",
                                               action = "Forbidden" }));
            return;
        }

        base.HandleUnauthorizedRequest(filterContext);   // 401 -> login redirect
    }
}

[Permission("orders.approve")]
public ActionResult Approve(int id) { ... }`, lang: "csharp" },
        { ul: [
          "**`AuthorizeCore`** returns the decision; **`HandleUnauthorizedRequest`** produces the response. Keep the two jobs separate.",
          "Distinguish **401 (not signed in → login)** from **403 (signed in but not allowed → forbidden page)**. The default sends both to the login page, which loops for an authenticated user.",
          "Authorization filters run **first and before model binding**, so parameters are not available. Read `RouteData` for the id, or check inside the action.",
          "**Never cache the result of a per-user check on the attribute instance** — instances are reused across requests and users.",
          "`[Authorize]` also disables output caching for the action, which is deliberate."
        ] }
      ]
    },

    {
      id: "actiondescriptor",
      q: "What is the purpose of the ActionDescriptor class?",
      tldr: "It is the reflection-free description of an action — its name, parameters, attributes and controller — that the invoker and filters use instead of touching MethodInfo directly.",
      tags: ["internals"],
      a: [
        { ul: [
          "`ReflectedActionDescriptor` is the usual implementation, wrapping a `MethodInfo` and **caching** the reflection results.",
          "Filters use it to inspect the action generically: name, parameters, and applied attributes.",
          "`GetParameters()` returns `ParameterDescriptor[]`, which is what model binding drives from.",
          "`GetCustomAttributes()` is how a filter reads other attributes on the action without reflecting itself.",
          "`ControllerDescriptor` is the equivalent one level up, and `ActionDescriptor.ControllerDescriptor` links them."
        ] },
        { code: `public class AuditAttribute : ActionFilterAttribute
{
    public override void OnActionExecuting(ActionExecutingContext filterContext)
    {
        var d = filterContext.ActionDescriptor;

        var action     = d.ActionName;
        var controller = d.ControllerDescriptor.ControllerName;
        var parameters = string.Join(", ",
            d.GetParameters().Select(p => $"{p.ParameterType.Name} {p.ParameterName}"));

        // Read another attribute without reflecting yourself
        var sensitive = d.GetCustomAttributes(typeof(SensitiveAttribute), true).Any();

        Audit.Write(filterContext.HttpContext.User.Identity.Name,
                    $"{controller}.{action}({parameters})", sensitive);
    }
}`, lang: "csharp" },
        { note: "Caching is the reason it exists. Reflecting over `MethodInfo` on every request would be slow, so MVC builds the descriptor once per action and reuses it.", kind: "tip" }
      ]
    },

    {
      id: "partial-page-updates",
      q: "How do you handle partial page updates in ASP.NET MVC?",
      tldr: "Return a PartialViewResult or JSON from an action and swap the fragment into the DOM with JavaScript — or use the unobtrusive Ajax helpers for the simple cases.",
      tags: ["ajax", "views"],
      a: [
        { p: "**Server-rendered fragment** — the server owns the markup, so no duplicate templating:" },
        { code: `[HttpGet]
public ActionResult Grid(string search, int page = 1)
{
    var model = _repo.Search(search, page);
    return Request.IsAjaxRequest()
        ? PartialView("_Grid", model)     // fragment for AJAX
        : (ActionResult)View("Index", model);   // full page for a direct hit
}`, lang: "csharp" },
        { code: `$('#search').on('input', function () {
    $.get('/Products/Grid', { search: this.value }, function (html) {
        $('#grid').html(html);
    });
});`, lang: "text" },
        { p: "**Unobtrusive Ajax helpers** — no JavaScript to write, needs `jquery.unobtrusive-ajax.js`:" },
        { code: `@using (Ajax.BeginForm("Grid", "Products", new AjaxOptions
{
    UpdateTargetId = "grid",
    InsertionMode = InsertionMode.Replace,
    HttpMethod = "GET",
    LoadingElementId = "spinner",
    OnSuccess = "afterUpdate"
}))
{
    <input name="search" />
    <button type="submit">Search</button>
}

<div id="grid">@Html.Partial("_Grid", Model)</div>`, lang: "razor" },
        { ul: [
          "**Fragment vs JSON**: returning HTML keeps templating in one place; returning JSON is better when the client already has a rendering layer.",
          "`Request.IsAjaxRequest()` (it checks the `X-Requested-With` header) lets one action serve both.",
          "Remember the **anti-forgery token** on AJAX POSTs.",
          "Re-run **`$.validator.unobtrusive.parse()`** on freshly injected markup, or client-side validation will not work in the new fragment.",
          "For heavy interactivity, a SPA framework or **SignalR** is a better fit than accumulating partial updates."
        ] }
      ]
    },

    {
      id: "viewcomponent-class",
      q: "What is the role of the ViewComponent class?",
      tldr: "It is the base class for a self-contained page region in ASP.NET Core MVC — its own logic, dependency injection and view, invoked from a parent view and unreachable by URL.",
      tags: ["views", "core"],
      seeAlso: ["mvc-intermediate/view-components", "mvc-advanced/childactiononly"],
      a: [
        { ul: [
          "Discovered by deriving from `ViewComponent`, by the `...ViewComponent` name suffix, or by `[ViewComponent]`.",
          "Implement **`InvokeAsync`** (or `Invoke`) returning `IViewComponentResult` — usually `View(model)`.",
          "It provides `ViewData`, `TempData`, `ModelState`, `HttpContext`, `User`, `Url` and `ViewBag` from the base class.",
          "View lookup: `/Views/{Controller}/Components/{ComponentName}/{ViewName}` then `/Views/Shared/Components/{ComponentName}/{ViewName}`, defaulting to `Default.cshtml`.",
          "**Not routable** and **not part of the controller pipeline** — no model binding, no filters, so it is lighter than a child action.",
          "Fully supports **constructor injection**, which child actions could not do cleanly."
        ] },
        { code: `public class RecentOrdersViewComponent : ViewComponent
{
    private readonly IOrderService _orders;
    public RecentOrdersViewComponent(IOrderService orders) => _orders = orders;

    public async Task<IViewComponentResult> InvokeAsync(int count = 5)
    {
        var model = await _orders.RecentAsync(User.Identity.Name, count);

        return model.Any()
            ? View(model)                    // Default.cshtml
            : View("Empty", model);          // Empty.cshtml
    }
}`, lang: "csharp" },
        { code: `@* /Views/Shared/Components/RecentOrders/Default.cshtml *@
@model IEnumerable<OrderSummary>
<ul>
    @foreach (var o in Model) { <li>@o.Reference — @o.Total.ToString("C")</li> }
</ul>`, lang: "razor" },
        { code: `@await Component.InvokeAsync("RecentOrders", new { count = 3 })
@await Component.InvokeAsync(typeof(RecentOrdersViewComponent), new { count = 3 })

@addTagHelper *, MyApp
<vc:recent-orders count="3"></vc:recent-orders>`, lang: "razor" },
        { note: "A view component returns a **fragment, not a response** — it cannot redirect or set a status code. If your region needs to do either, it belongs in the controller.", kind: "warn" }
      ]
    },

    {
      id: "custom-tempdata-provider",
      q: "How do you implement a custom TempData provider in ASP.NET MVC?",
      tldr: "Implement ITempDataProvider's LoadTempData and SaveTempData, then assign it to Controller.TempDataProvider — usually to replace session with cookies for a stateless farm.",
      tags: ["state", "extensibility"],
      seeAlso: ["mvc-intermediate/tempdata-dictionary"],
      a: [
        { p: "The default `SessionStateTempDataProvider` requires session. In a load-balanced, stateless deployment that is a problem — a cookie-based provider removes the dependency." },
        { code: `public class CookieTempDataProvider : ITempDataProvider
{
    private const string CookieName = "__tempdata";

    public IDictionary<string, object> LoadTempData(ControllerContext context)
    {
        var cookie = context.HttpContext.Request.Cookies[CookieName];
        if (string.IsNullOrEmpty(cookie?.Value))
            return new Dictionary<string, object>();

        var protectedBytes = Convert.FromBase64String(cookie.Value);
        var bytes = MachineKey.Unprotect(protectedBytes, CookieName);
        var json = Encoding.UTF8.GetString(bytes);

        // Read-once: expire the cookie immediately
        Expire(context);

        return JsonConvert.DeserializeObject<Dictionary<string, object>>(json);
    }

    public void SaveTempData(ControllerContext context,
                             IDictionary<string, object> values)
    {
        if (values == null || values.Count == 0) { Expire(context); return; }

        var json = JsonConvert.SerializeObject(values);
        var bytes = Encoding.UTF8.GetBytes(json);
        var protectedBytes = MachineKey.Protect(bytes, CookieName);

        context.HttpContext.Response.Cookies.Add(new HttpCookie(CookieName)
        {
            Value = Convert.ToBase64String(protectedBytes),
            HttpOnly = true,
            Secure = context.HttpContext.Request.IsSecureConnection
        });
    }

    private static void Expire(ControllerContext context)
        => context.HttpContext.Response.Cookies.Add(new HttpCookie(CookieName)
           {
               Expires = DateTime.UtcNow.AddDays(-1),
               HttpOnly = true
           });
}`, lang: "csharp" },
        { code: `// Wire it up on a base controller, or via the controller factory
public class BaseController : Controller
{
    protected override ITempDataProvider CreateTempDataProvider()
        => new CookieTempDataProvider();
}`, lang: "csharp" },
        { ul: [
          "**Always encrypt** the cookie — `MachineKey.Protect` here — since the client can otherwise read and tamper with it.",
          "Cookies are limited to about **4 KB**, so this only works for small values. That is a feature: it discourages putting objects in TempData.",
          "In a web farm every node needs the same `<machineKey>` to unprotect the cookie.",
          "ASP.NET Core ships `CookieTempDataProvider` out of the box — no custom code needed there."
        ] }
      ]
    },

    {
      id: "iview-interface",
      q: "What is the purpose of the IView interface?",
      tldr: "It is the minimal contract for anything that can render a response — a single Render(ViewContext, TextWriter) method, which is what decouples MVC from Razor.",
      tags: ["views", "internals"],
      seeAlso: ["mvc-advanced/custom-view-engine"],
      a: [
        { code: `public interface IView
{
    void Render(ViewContext viewContext, TextWriter writer);
}`, lang: "csharp" },
        { ul: [
          "One method. That is the whole abstraction, and it is why MVC does not care whether the template is Razor, WebForms, or something you invented.",
          "`ViewContext` supplies the model, `ViewData`, `TempData`, `RouteData` and `HttpContext`; the `TextWriter` is where output goes.",
          "`IViewEngine.FindView` returns a `ViewEngineResult` containing an `IView` — engine finds it, view renders it.",
          "`RazorView` is the standard implementation. `ViewResult.ExecuteResult` is what ultimately calls `Render`."
        ] },
        { code: `public class JsonView : IView
{
    public void Render(ViewContext viewContext, TextWriter writer)
    {
        viewContext.HttpContext.Response.ContentType = "application/json";
        writer.Write(JsonConvert.SerializeObject(viewContext.ViewData.Model));
    }
}

public class MarkdownView : IView
{
    private readonly string _path;
    public MarkdownView(string path) => _path = path;

    public void Render(ViewContext viewContext, TextWriter writer)
    {
        var markdown = File.ReadAllText(
            viewContext.HttpContext.Server.MapPath(_path));
        writer.Write(Markdown.ToHtml(markdown));
    }
}`, lang: "csharp" },
        { note: "The pairing to remember: **`IViewEngine` locates, `IView` renders.** A custom view engine that returns your own `IView` is the full extensibility story for a non-Razor template language.", kind: "tip" }
      ]
    },

    {
      id: "owin",
      q: "How do you use OWIN in ASP.NET MVC?",
      tldr: "OWIN is an interface between .NET web servers and applications; you add a Startup class with a Configuration(IAppBuilder) method and compose middleware there — which is how Identity and SignalR are wired up in MVC 5.",
      tags: ["pipeline", "architecture"],
      a: [
        { p: "**OWIN** (Open Web Interface for .NET) is a specification, not a library. It defines a simple contract — `Func<IDictionary<string, object>, Task>` — that decouples the application from IIS. **Katana** is Microsoft's implementation." },
        { code: `[assembly: OwinStartup(typeof(Shop.Startup))]

namespace Shop
{
    public class Startup
    {
        public void Configuration(IAppBuilder app)
        {
            // Order matters — this is a pipeline
            app.UseErrorPage();

            app.CreatePerOwinContext(ShopContext.Create);
            app.CreatePerOwinContext<AppUserManager>(AppUserManager.Create);

            app.UseCookieAuthentication(new CookieAuthenticationOptions
            {
                AuthenticationType = DefaultAuthenticationTypes.ApplicationCookie,
                LoginPath = new PathString("/Account/Login"),
                ExpireTimeSpan = TimeSpan.FromHours(8),
                SlidingExpiration = true
            });

            app.UseGoogleAuthentication(clientId, clientSecret);

            app.MapSignalR();

            // Custom inline middleware
            app.Use(async (context, next) =>
            {
                var sw = Stopwatch.StartNew();
                await next();
                Logger.Info($"{context.Request.Path} {sw.ElapsedMilliseconds} ms");
            });
        }
    }
}`, lang: "csharp" },
        { ul: [
          "**Why it exists**: `System.Web` welded ASP.NET to IIS. OWIN made the app host-agnostic — IIS, self-host, or Katana — and made the pipeline composable.",
          "Middleware runs in **registration order** on the way in and reverses on the way out, each deciding whether to call `next()`.",
          "In MVC 5 it is how **ASP.NET Identity**, **external logins** and **SignalR** are configured.",
          "MVC 5 itself still runs on `System.Web`, so an OWIN pipeline sits **alongside** it rather than replacing it — a partial migration.",
          "**ASP.NET Core** completed the idea: the whole framework is middleware, and OWIN as a separate concept is no longer needed."
        ] },
        { note: "The neat one-line summary for an interview: OWIN is the bridge between the old `System.Web` world and the middleware pipeline that ASP.NET Core is built on.", kind: "tip" }
      ]
    }

  ]
});
