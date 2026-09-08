/* ASP.NET MVC — Basic. 30 questions. See data/manifest.js for the authoring guide.
   Answers target classic ASP.NET MVC 5 (which is what these questions describe),
   with a note on the ASP.NET Core equivalent wherever the two differ. */
QL.register({
  id: "mvc-basic",
  topic: "ASP.NET MVC",
  level: "Basic",
  short: "MVC Basic",
  accent: "blue",
  desc: "The request pipeline end to end: routing, controllers, actions, views, Razor, model binding, validation and the state-passing mechanisms.",
  questions: [

    {
      id: "what-is-aspnet-mvc",
      q: "What is ASP.NET MVC?",
      tldr: "A web framework from Microsoft that implements the Model-View-Controller pattern over ASP.NET, giving clean separation of concerns, full control of the markup and testable controllers.",
      tags: ["fundamentals"],
      a: [
        { ul: [
          "Requests are routed to a **controller action** rather than to a physical page file.",
          "**Separation of concerns** — model (data and rules), view (presentation), controller (request handling).",
          "**Full control over HTML** — no ViewState, no server controls, no mangled client IDs.",
          "**Testable** — controllers are plain classes with no dependency on `HttpContext` if you design them well.",
          "**Convention over configuration** — `HomeController.Index()` maps to `/Views/Home/Index.cshtml` with nothing to configure.",
          "Built-in **model binding**, **validation**, **filters** and **areas**."
        ] },
        { note: "The modern successor is **ASP.NET Core MVC**: cross-platform, built-in dependency injection, middleware instead of HTTP modules, and `Program.cs` instead of `Global.asax`. The MVC concepts themselves carry over almost unchanged.", kind: "tip" }
      ]
    },

    {
      id: "mvc-architecture",
      q: "Explain the MVC architecture.",
      tldr: "MVC splits an application into Model (data and business rules), View (presentation) and Controller (handles input, coordinates the other two).",
      tags: ["architecture", "patterns"],
      a: [
        { table: { head: ["Layer", "Responsibility", "Should not"], rows: [
          ["**Model**", "Data, business rules, validation, persistence", "Know about HTTP or views"],
          ["**View**", "Render the model as HTML", "Contain business logic or query the database"],
          ["**Controller**", "Accept the request, invoke the model, choose the view/result", "Contain business logic or build HTML"]
        ] } },
        { p: "The request flow:" },
        { ol: [
          "A request arrives and **routing** matches it to a controller and action.",
          "The **controller factory** creates the controller; **model binding** populates the action parameters.",
          "The action runs, calls into the **model** or a service, and returns an `ActionResult`.",
          "If it is a `ViewResult`, the **view engine** finds and renders the `.cshtml` with the model.",
          "The response is written back to the client."
        ] },
        { note: "The benefits to name: testability, parallel development (a designer on views while a developer works on controllers), and clean URLs. The cost: more files and more ceremony than Web Forms for a very simple page.", kind: "tip" }
      ]
    },

    {
      id: "main-components",
      q: "What are the main components of ASP.NET MVC?",
      tldr: "Model, View and Controller, plus the supporting cast: routing, model binders, view engine, filters, areas and HTML helpers.",
      tags: ["fundamentals"],
      a: [
        { table: { head: ["Component", "Role"], rows: [
          ["**Model**", "Domain classes, view models, validation attributes, data access"],
          ["**View**", "`.cshtml` Razor templates that render HTML"],
          ["**Controller**", "Classes deriving from `Controller` with public action methods"],
          ["**Routing**", "Maps a URL to a controller/action and extracts parameters"],
          ["**Model binder**", "Populates action parameters from route, query string, form and body"],
          ["**View engine**", "Razor — locates and executes views"],
          ["**Filters**", "Cross-cutting hooks: authorisation, action, result, exception"],
          ["**Areas**", "Sub-applications with their own controllers, views and routes"],
          ["**HTML helpers / tag helpers**", "Generate markup bound to the model"],
          ["**`Global.asax`**", "Application lifecycle and startup registration (MVC 5)"]
        ] } }
      ]
    },

    {
      id: "routing",
      q: "How does the routing work in ASP.NET MVC?",
      tldr: "The routing engine matches an incoming URL against registered route templates in order, extracts route values, and uses controller + action to pick the method to invoke.",
      tags: ["routing"],
      seeAlso: ["mvc-basic/custom-route", "mvc-intermediate/attribute-routing"],
      a: [
        { ol: [
          "The `UrlRoutingModule` intercepts the request before it reaches a physical file.",
          "Routes in `RouteTable.Routes` are tested **in the order they were registered** — the first match wins.",
          "Matched segments become **route values** (`controller`, `action`, plus any custom tokens).",
          "`MvcRouteHandler` resolves the controller, then the action selector picks the method.",
          "Remaining route values feed **model binding** for the action parameters."
        ] },
        { code: `public class RouteConfig
{
    public static void RegisterRoutes(RouteCollection routes)
    {
        routes.IgnoreRoute("{resource}.axd/{*pathInfo}");

        routes.MapRoute(
            name: "ProductByCategory",                    // specific routes first
            url: "products/{category}/{id}",
            defaults: new { controller = "Products", action = "Details" },
            constraints: new { id = @"\\d+" }
        );

        routes.MapRoute(
            name: "Default",
            url: "{controller}/{action}/{id}",
            defaults: new { controller = "Home", action = "Index",
                            id = UrlParameter.Optional }
        );
    }
}`, lang: "csharp" },
        { note: "Order matters and it is the usual bug: put the **most specific route first**, because the default `{controller}/{action}/{id}` route matches almost everything and will shadow anything registered after it.", kind: "warn" }
      ]
    },

    {
      id: "controller",
      q: "What is a Controller in ASP.NET MVC?",
      tldr: "A class deriving from Controller whose public methods (actions) handle requests, coordinate the model, and return an ActionResult.",
      tags: ["controllers"],
      a: [
        { ul: [
          "By convention the name ends with **`Controller`**, and the routing token drops the suffix — `ProductsController` is reached as `/Products`.",
          "It must be **public, non-abstract**, and derive from `Controller` (or implement `IController`).",
          "It exposes `Request`, `Response`, `Session`, `User`, `ViewBag`, `ViewData`, `TempData` and `ModelState` through its base class.",
          "It should be **thin**: validate, delegate to a service, choose a result. Business logic belongs in the model or a service.",
          "Base-class hooks: `OnActionExecuting`, `OnActionExecuted`, `OnException`."
        ] },
        { code: `public class ProductsController : Controller
{
    private readonly IProductService _service;

    public ProductsController(IProductService service) => _service = service;

    public ActionResult Index() => View(_service.GetAll());

    public ActionResult Details(int id)
    {
        var product = _service.Find(id);
        if (product == null) return HttpNotFound();
        return View(product);
    }
}`, lang: "csharp" }
      ]
    },

    {
      id: "action-method",
      q: "What is an Action Method in ASP.NET MVC?",
      tldr: "A public method on a controller that handles a request and returns an ActionResult describing the response.",
      tags: ["controllers"],
      seeAlso: ["mvc-basic/action-return-types"],
      a: [
        { ul: [
          "Must be **public**, **non-static**, and not marked `[NonAction]`.",
          "Cannot be **overloaded by C# signature alone** for the same HTTP verb — the action selector cannot choose. Differentiate with `[HttpGet]`/`[HttpPost]` or `[ActionName]`.",
          "Parameters are filled by **model binding** from route values, query string, form fields and the request body.",
          "Return type is usually `ActionResult`; returning any other type wraps it in a `ContentResult`.",
          "Attributes such as `[HttpPost]`, `[Authorize]`, `[ValidateAntiForgeryToken]` and `[OutputCache]` shape how it is selected and executed."
        ] },
        { code: `public class AccountController : Controller
{
    [HttpGet]
    public ActionResult Login(string returnUrl)
    {
        ViewBag.ReturnUrl = returnUrl;
        return View();
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public ActionResult Login(LoginViewModel model, string returnUrl)
    {
        if (!ModelState.IsValid) return View(model);
        return RedirectToLocal(returnUrl);
    }

    [NonAction]
    private ActionResult RedirectToLocal(string url)
        => Url.IsLocalUrl(url) ? (ActionResult)Redirect(url)
                               : RedirectToAction("Index", "Home");
}`, lang: "csharp" }
      ]
    },

    {
      id: "view",
      q: "What is a View in ASP.NET MVC?",
      tldr: "A Razor .cshtml template responsible only for rendering the model as HTML — no business logic and no data access.",
      tags: ["views", "razor"],
      a: [
        { ul: [
          "Lives at **`/Views/{Controller}/{Action}.cshtml`**, with `/Views/Shared/` as the fallback location.",
          "`return View()` uses the action name; `return View(\"Other\")` names one explicitly.",
          "**Strongly typed** with `@model`, which gives compile-time checking and IntelliSense — always prefer this to `ViewBag`.",
          "`_Layout.cshtml` supplies the shared page shell; `_ViewStart.cshtml` selects it automatically.",
          "Views should contain presentation logic only. No queries, no business rules."
        ] },
        { code: `@model IEnumerable<Shop.Models.Product>
@{
    ViewBag.Title = "Products";
}

<h2>@ViewBag.Title</h2>

<table class="table">
    @foreach (var p in Model)
    {
        <tr>
            <td>@Html.DisplayFor(m => p.Name)</td>
            <td>@p.Price.ToString("C")</td>
            <td>@Html.ActionLink("Edit", "Edit", new { id = p.Id })</td>
        </tr>
    }
</table>`, lang: "razor" }
      ]
    },

    {
      id: "model",
      q: "What is a Model in ASP.NET MVC?",
      tldr: "The part of the application that represents data and business rules — domain entities, view models and the validation attributes on them.",
      tags: ["models"],
      seeAlso: ["mvc-intermediate/viewmodel"],
      a: [
        { ul: [
          "**Domain / entity model** — maps to persistence, holds business rules.",
          "**View model** — shaped for exactly one view: only the fields that screen needs, plus display and validation attributes.",
          "**Data annotations** on the model drive both server-side validation and client-side unobtrusive validation.",
          "The model should be ignorant of HTTP, controllers and views."
        ] },
        { code: `public class Product              // domain entity
{
    public int Id { get; set; }
    public string Name { get; set; }
    public decimal Price { get; set; }
    public int SupplierId { get; set; }
    public virtual Supplier Supplier { get; set; }
}

public class ProductEditViewModel  // shaped for one screen
{
    public int Id { get; set; }

    [Required, StringLength(100)]
    [Display(Name = "Product name")]
    public string Name { get; set; }

    [Range(0.01, 100000)]
    [DataType(DataType.Currency)]
    public decimal Price { get; set; }

    public IEnumerable<SelectListItem> Suppliers { get; set; }
}`, lang: "csharp" },
        { note: "Binding a domain entity straight from a form is the **over-posting** vulnerability: an attacker adds `IsAdmin=true` to the POST and the binder sets it. A view model with only the intended fields removes the problem by construction.", kind: "warn" }
      ]
    },

    {
      id: "viewbag-viewdata",
      q: "Explain the role of ViewBag and ViewData in MVC.",
      tldr: "Both pass extra data from a controller to its view for the current request only — ViewData is a string-keyed dictionary, ViewBag is a dynamic wrapper over the same storage.",
      tags: ["state"],
      seeAlso: ["mvc-basic/viewbag-vs-viewdata-vs-tempdata"],
      a: [
        { ul: [
          "They share the **same underlying dictionary** — a value set on one is readable through the other.",
          "**`ViewData[\"x\"]`** returns `object`, so it needs casting and is checked at runtime.",
          "**`ViewBag.X`** is `dynamic`: no cast, but also no compile-time checking and no IntelliSense.",
          "Both live for **one request only** and do not survive a redirect.",
          "Use them for small incidental extras — a page title, a dropdown list. Real data belongs on a **strongly typed model**."
        ] },
        { code: `public ActionResult Edit(int id)
{
    ViewBag.Title = "Edit product";                 // dynamic
    ViewData["Categories"] = _repo.GetCategories(); // dictionary
    return View(_repo.Find(id));                    // the actual model
}`, lang: "csharp" },
        { code: `<h2>@ViewBag.Title</h2>

@{ var cats = (List<Category>)ViewData["Categories"]; }  @* cast required *@
@foreach (var c in cats) { <span>@c.Name</span> }`, lang: "razor" },
        { note: "`ViewBag` is `dynamic`, so a typo like `@ViewBag.Titel` silently renders nothing instead of failing to compile. That is the main argument for a view model.", kind: "warn" }
      ]
    },

    {
      id: "razor-view-engine",
      q: "What is Razor View Engine?",
      tldr: "The default MVC template engine: a compact syntax that mixes C# into HTML using @, with automatic HTML encoding and no explicit block delimiters.",
      tags: ["razor", "views"],
      a: [
        { ul: [
          "`@` switches from markup to code; Razor infers where the expression ends, so there is no closing tag.",
          "**Output is HTML-encoded by default**, which prevents most XSS. `@Html.Raw(...)` opts out — and is where XSS bugs come from.",
          "`@{ ... }` is a code block, `@if`/`@foreach` are control structures, `@* ... *@` is a comment.",
          "`@model` declares the model type; `@using` imports a namespace; `@section` fills a layout placeholder.",
          "Views are **compiled** (to classes deriving from `WebViewPage`), so syntax errors surface at build or first request.",
          "File extensions: `.cshtml` for C#, `.vbhtml` for VB."
        ] },
        { code: `@model OrderViewModel
@using Shop.Helpers

@{
    ViewBag.Title = "Order " + Model.Reference;
    var isLate = Model.DueDate < DateTime.Today;
}

<h2>@Model.Reference</h2>

@if (isLate)
{
    <p class="alert">Overdue by @((DateTime.Today - Model.DueDate).Days) days</p>
}

@foreach (var line in Model.Lines)
{
    <div>@line.Description — @line.Amount.ToString("C")</div>
}

@section Scripts {
    <script src="~/Scripts/order.js"></script>
}`, lang: "razor" }
      ]
    },

    {
      id: "create-mvc-project",
      q: "How do you create a new ASP.NET MVC project in Visual Studio?",
      tldr: "File → New → Project → ASP.NET Web Application, pick the MVC template, choose the authentication mode, and Visual Studio scaffolds the folder structure and startup configuration.",
      tags: ["tooling"],
      a: [
        { ol: [
          "**File → New → Project**, choose **ASP.NET Web Application (.NET Framework)** for MVC 5, or **ASP.NET Core Web App (Model-View-Controller)** for Core.",
          "Pick the **MVC** template; optionally tick Web API and unit tests.",
          "Choose **Authentication** — None, Individual User Accounts, Work or School, or Windows.",
          "Visual Studio generates the standard structure and the startup wiring."
        ] },
        { table: { head: ["Folder / file", "Contains"], rows: [
          ["`/Controllers`", "Controller classes"],
          ["`/Views`", "Razor views, `/Shared` for layouts and partials"],
          ["`/Models`", "Domain and view models"],
          ["`/App_Start`", "`RouteConfig`, `BundleConfig`, `FilterConfig`, `WebApiConfig`"],
          ["`/Content`, `/Scripts`", "CSS and JavaScript"],
          ["`Global.asax`", "Application lifecycle events, calls the `App_Start` registrations"],
          ["`Web.config`", "Configuration: connection strings, app settings, modules"]
        ] } },
        { code: `dotnet new mvc -n Shop
cd Shop
dotnet run`, lang: "bash", caption: "The ASP.NET Core equivalent from the CLI" }
      ]
    },

    {
      id: "global-asax",
      q: "What is the purpose of the Global.asax file?",
      tldr: "It is the application entry point for lifecycle events — Application_Start is where routes, filters, bundles and areas are registered.",
      tags: ["lifecycle", "configuration"],
      seeAlso: ["mvc-intermediate/application-start"],
      a: [
        { code: `public class MvcApplication : System.Web.HttpApplication
{
    protected void Application_Start()
    {
        AreaRegistration.RegisterAllAreas();
        FilterConfig.RegisterGlobalFilters(GlobalFilters.Filters);
        RouteConfig.RegisterRoutes(RouteTable.Routes);
        BundleConfig.RegisterBundles(BundleTable.Bundles);
    }

    protected void Application_Error()
    {
        var ex = Server.GetLastError();
        Logger.Error(ex);
    }

    protected void Session_Start() { }
    protected void Application_BeginRequest() { }
    protected void Application_End() { }
}`, lang: "csharp" },
        { table: { head: ["Event", "Fires"], rows: [
          ["`Application_Start`", "Once, when the app domain starts"],
          ["`Application_End`", "Once, on shutdown or recycle"],
          ["`Application_BeginRequest` / `EndRequest`", "Every request"],
          ["`Application_Error`", "On any unhandled exception"],
          ["`Session_Start` / `Session_End`", "Per user session"]
        ] } },
        { note: "In **ASP.NET Core** there is no `Global.asax`. `Program.cs` (with the minimal hosting model) does the startup registration, and middleware replaces the per-request events.", kind: "tip" }
      ]
    },

    {
      id: "form-submission",
      q: "How do you handle form submission in ASP.NET MVC?",
      tldr: "A GET action renders the form, a POST action of the same name receives the model via model binding, checks ModelState and then redirects on success.",
      tags: ["forms", "binding"],
      a: [
        { code: `[HttpGet]
public ActionResult Create() => View(new ProductViewModel());

[HttpPost]
[ValidateAntiForgeryToken]
public ActionResult Create(ProductViewModel model)
{
    if (!ModelState.IsValid)
        return View(model);              // redisplay with errors and values

    _service.Create(model);
    TempData["Message"] = "Product created";
    return RedirectToAction("Index");    // POST-Redirect-GET
}`, lang: "csharp" },
        { code: `@model ProductViewModel

@using (Html.BeginForm("Create", "Products", FormMethod.Post))
{
    @Html.AntiForgeryToken()
    @Html.ValidationSummary(true)

    @Html.LabelFor(m => m.Name)
    @Html.EditorFor(m => m.Name)
    @Html.ValidationMessageFor(m => m.Name)

    <button type="submit">Save</button>
}`, lang: "razor" },
        { ul: [
          "**Model binding** matches form field names to model property names automatically.",
          "Always check **`ModelState.IsValid`** and return the same view with the model on failure, so the user does not lose their input.",
          "Use **POST-Redirect-GET** so a browser refresh does not resubmit the form.",
          "`@Html.AntiForgeryToken()` plus `[ValidateAntiForgeryToken]` protects against CSRF.",
          "For file uploads add `new { enctype = \"multipart/form-data\" }` and take an `HttpPostedFileBase`."
        ] }
      ]
    },

    {
      id: "tempdata",
      q: "What is TempData in ASP.NET MVC?",
      tldr: "A dictionary that survives exactly one additional request, backed by session — designed for passing a message across a redirect.",
      tags: ["state"],
      seeAlso: ["mvc-basic/viewbag-vs-viewdata-vs-tempdata", "mvc-intermediate/tempdata-dictionary"],
      a: [
        { ul: [
          "Values persist until they are **read**, then they are marked for deletion at the end of that request.",
          "Its purpose is the **POST-Redirect-GET** message — `ViewBag`/`ViewData` are gone after a redirect.",
          "**`Peek(key)`** reads without marking for deletion; **`Keep(key)`** retains a value you have already read.",
          "Backed by **session state** by default, so it needs session enabled and does not work with a stateless configuration unless you supply another provider.",
          "It stores `object`, so reading needs a cast."
        ] },
        { code: `[HttpPost]
public ActionResult Delete(int id)
{
    _service.Delete(id);
    TempData["Message"] = "Product deleted";
    return RedirectToAction("Index");     // survives the redirect
}

public ActionResult Index()
{
    var msg = TempData["Message"] as string;   // read: now marked for deletion
    TempData.Keep("Message");                  // ...unless we keep it
    return View();
}`, lang: "csharp" },
        { code: `@if (TempData["Message"] != null)
{
    <div class="alert alert-success">@TempData["Message"]</div>
}`, lang: "razor" }
      ]
    },

    {
      id: "validation",
      q: "How do you perform validation in ASP.NET MVC?",
      tldr: "Annotate the model with data annotations; the framework validates on binding, fills ModelState, and emits client-side rules through unobtrusive validation.",
      tags: ["validation"],
      seeAlso: ["mvc-intermediate/model-validation", "mvc-intermediate/custom-validation"],
      a: [
        { code: `public class RegisterViewModel
{
    [Required(ErrorMessage = "Email is required")]
    [EmailAddress]
    public string Email { get; set; }

    [Required]
    [StringLength(100, MinimumLength = 8)]
    [DataType(DataType.Password)]
    public string Password { get; set; }

    [Compare(nameof(Password), ErrorMessage = "Passwords do not match")]
    [DataType(DataType.Password)]
    public string ConfirmPassword { get; set; }

    [Range(18, 120)]
    public int Age { get; set; }

    [RegularExpression(@"^[0-9]{10}$")]
    public string Phone { get; set; }
}`, lang: "csharp" },
        { code: `[HttpPost]
[ValidateAntiForgeryToken]
public ActionResult Register(RegisterViewModel model)
{
    if (_repo.EmailExists(model.Email))
        ModelState.AddModelError(nameof(model.Email), "Email already registered");

    if (!ModelState.IsValid) return View(model);

    _service.Register(model);
    return RedirectToAction("Index", "Home");
}`, lang: "csharp" },
        { ul: [
          "Common annotations: `[Required]`, `[StringLength]`, `[Range]`, `[RegularExpression]`, `[Compare]`, `[EmailAddress]`, `[Phone]`, `[Url]`, `[CreditCard]`.",
          "**Client-side** validation comes free from `jquery.validate` plus `jquery.validate.unobtrusive` and the `data-val-*` attributes the helpers emit.",
          "**Server-side validation is mandatory** — client-side is a convenience and is trivially bypassed.",
          "`IValidatableObject` handles cross-property rules that no single attribute can express.",
          "Add business-rule errors manually with `ModelState.AddModelError`."
        ] }
      ]
    },

    {
      id: "scaffolding",
      q: "Explain the concept of Scaffolding in ASP.NET MVC.",
      tldr: "Code generation that produces a controller and CRUD views from a model class and data context, giving you a working starting point in seconds.",
      tags: ["tooling"],
      a: [
        { ul: [
          "Right-click **Controllers → Add → New Scaffolded Item**, choose *MVC 5 Controller with views, using Entity Framework*, and pick the model plus data context.",
          "It generates the controller with **Index, Details, Create, Edit and Delete** actions, and the matching Razor views.",
          "Views are generated from **T4 templates**, which you can customise per project by copying them into `/CodeTemplates`.",
          "It reads **data annotations** to produce labels, editors and validation markup.",
          "**Treat the output as a draft.** Scaffolded controllers bind entities directly (over-posting risk), talk straight to `DbContext`, and have no authorisation."
        ] },
        { code: `dotnet aspnet-codegenerator controller -name ProductsController \\
    -m Product -dc ShopContext --relativeFolderPath Controllers \\
    --useDefaultLayout --referenceScriptLibraries`, lang: "bash", caption: "ASP.NET Core CLI equivalent" },
        { note: "The interview point to make: scaffolding is a productivity tool for prototypes and admin screens, not an architecture. Production code replaces the entity binding with view models and the direct `DbContext` use with a service.", kind: "tip" }
      ]
    },

    {
      id: "partial-view",
      q: "What is a Partial View in ASP.NET MVC?",
      tldr: "A reusable .cshtml fragment rendered inside another view — no layout of its own — used for shared markup and AJAX updates.",
      tags: ["views"],
      seeAlso: ["mvc-intermediate/partial-views", "mvc-intermediate/partial-vs-renderpartial"],
      a: [
        { ul: [
          "Named with a leading underscore by convention: `_ProductCard.cshtml`.",
          "Placed in the controller's view folder, or in `/Views/Shared/` to be reusable everywhere.",
          "It does **not** run `_ViewStart.cshtml`, so it gets no layout.",
          "Render it with `@Html.Partial`, `@Html.RenderPartial`, or `@Html.Action` when it needs its own controller logic.",
          "Returning `PartialView()` from an action is how AJAX updates a page region."
        ] },
        { code: `@* /Views/Shared/_ProductCard.cshtml *@
@model Product

<div class="card">
    <h4>@Model.Name</h4>
    <p>@Model.Price.ToString("C")</p>
</div>`, lang: "razor" },
        { code: `@* Used from a parent view *@
@foreach (var p in Model.Products)
{
    @Html.Partial("_ProductCard", p)
}`, lang: "razor" },
        { code: `[HttpGet]
public ActionResult Card(int id)
    => PartialView("_ProductCard", _repo.Find(id));   // no layout, for AJAX`, lang: "csharp" },
        { note: "A partial view **renders markup from a model you pass in**. If the fragment needs to fetch its own data, use `Html.Action`/`RenderAction` (MVC 5) or a **View Component** (Core) instead.", kind: "tip" }
      ]
    },

    {
      id: "authentication",
      q: "How do you implement authentication in ASP.NET MVC?",
      tldr: "Pick a scheme (Forms/OWIN cookies, ASP.NET Identity, Windows, or external providers), issue a cookie on sign-in, and guard actions with the [Authorize] attribute.",
      tags: ["security", "auth"],
      seeAlso: ["mvc-intermediate/authorize-attribute", "mvc-intermediate/role-based-authorization"],
      a: [
        { ul: [
          "**ASP.NET Identity** (MVC 5 default) — users, roles, claims, password hashing, lockout, external logins, two-factor.",
          "**OWIN cookie authentication** — issues an encrypted cookie carrying a `ClaimsIdentity`.",
          "**Windows authentication** — the domain identity, for intranets.",
          "**External / federated** — Google, Microsoft, Azure AD, OAuth/OpenID Connect.",
          "**Authentication** proves who you are; **authorisation** decides what you may do. `[Authorize]` covers the second."
        ] },
        { code: `[HttpPost]
[ValidateAntiForgeryToken]
public async Task<ActionResult> Login(LoginViewModel model, string returnUrl)
{
    if (!ModelState.IsValid) return View(model);

    var result = await SignInManager.PasswordSignInAsync(
        model.Email, model.Password, model.RememberMe, shouldLockout: true);

    switch (result)
    {
        case SignInStatus.Success:        return RedirectToLocal(returnUrl);
        case SignInStatus.LockedOut:      return View("Lockout");
        default:
            ModelState.AddModelError("", "Invalid login attempt.");
            return View(model);
    }
}

[Authorize]
public ActionResult Profile() => View(UserManager.FindById(User.Identity.GetUserId()));

[Authorize(Roles = "Admin")]
public ActionResult Users() => View();`, lang: "csharp" },
        { note: "Essentials to mention: never store plain passwords (Identity uses PBKDF2), always use `[ValidateAntiForgeryToken]` on the login POST, enforce HTTPS with `[RequireHttps]`, and validate `returnUrl` with `Url.IsLocalUrl` to prevent open redirects.", kind: "warn" }
      ]
    },

    {
      id: "web-config",
      q: "What is the web.config file used for?",
      tldr: "The XML configuration file for an ASP.NET application — connection strings, app settings, authentication, modules, handlers and compilation settings.",
      tags: ["configuration"],
      a: [
        { code: `<configuration>
  <connectionStrings>
    <add name="ShopContext"
         connectionString="Server=.;Database=Shop;Integrated Security=true"
         providerName="System.Data.SqlClient" />
  </connectionStrings>

  <appSettings>
    <add key="PageSize" value="25" />
  </appSettings>

  <system.web>
    <compilation debug="true" targetFramework="4.8" />
    <customErrors mode="RemoteOnly" defaultRedirect="~/Error" />
    <authentication mode="None" />
    <sessionState timeout="20" />
  </system.web>

  <system.webServer>
    <modules runAllManagedModulesForAllRequests="true" />
  </system.webServer>
</configuration>`, lang: "xml" },
        { ul: [
          "Settings are **hierarchical** — a `web.config` in a subfolder overrides the root for that folder.",
          "**Config transforms** (`Web.Release.config`) rewrite values per build configuration on publish.",
          "Editing it **restarts the application** — the app domain is recycled.",
          "Secrets should not live here in source control: use transforms, `configSource`, or encrypt sections with `aspnet_regiis -pe`.",
          "Set `<compilation debug=\"false\">` in production — `debug=\"true\"` disables optimisations and timeouts."
        ] },
        { note: "**ASP.NET Core** replaces it with `appsettings.json` plus environment variables and user secrets, layered through `IConfiguration` and injected via the options pattern.", kind: "tip" }
      ]
    },

    {
      id: "html-helpers",
      q: "How do you use HTML helpers in ASP.NET MVC?",
      tldr: "HTML helpers are methods on @Html that generate markup; the strongly typed *For variants bind to a model expression and emit validation attributes automatically.",
      tags: ["views", "razor"],
      a: [
        { table: { head: ["Helper", "Produces"], rows: [
          ["`@Html.TextBoxFor(m => m.Name)`", "`<input type=\"text\" name=\"Name\">` with `data-val-*`"],
          ["`@Html.LabelFor(m => m.Name)`", "`<label>` using `[Display]`"],
          ["`@Html.EditorFor(m => m.X)`", "The right editor for the type / `[DataType]`"],
          ["`@Html.DisplayFor(m => m.X)`", "Read-only formatted output"],
          ["`@Html.DropDownListFor(...)`", "`<select>` from a `SelectList`"],
          ["`@Html.ValidationMessageFor(...)`", "Per-field error span"],
          ["`@Html.ActionLink(...)`", "`<a>` built from routing"],
          ["`@Html.BeginForm(...)`", "`<form>` with the right action URL"],
          ["`@Html.Partial(...)`", "A partial view"]
        ] } },
        { code: `@model ProductViewModel

@using (Html.BeginForm())
{
    @Html.AntiForgeryToken()

    @Html.LabelFor(m => m.Name)
    @Html.TextBoxFor(m => m.Name, new { @class = "form-control" })
    @Html.ValidationMessageFor(m => m.Name)

    @Html.DropDownListFor(m => m.CategoryId, Model.Categories, "-- choose --")

    @Html.HiddenFor(m => m.Id)
    <button type="submit">Save</button>
}`, lang: "razor" },
        { ul: [
          "Prefer the **`*For` (strongly typed)** helpers: refactor-safe, compile-checked, and they generate the validation attributes.",
          "`@class` needs the `@` prefix because `class` is a C# keyword; underscores in an anonymous object become dashes (`data_id` → `data-id`).",
          "You can write **custom helpers** as extension methods on `HtmlHelper` returning `MvcHtmlString`.",
          "**ASP.NET Core** adds **tag helpers** (`<input asp-for=\"Name\" />`), which look like plain HTML and are generally preferred there."
        ] }
      ]
    },

    {
      id: "viewbag-vs-viewdata-vs-tempdata",
      q: "What is the difference between ViewBag, ViewData, and TempData?",
      tldr: "ViewData is a dictionary and ViewBag its dynamic wrapper — both last one request; TempData is session-backed and survives one redirect.",
      tags: ["state"],
      seeAlso: ["mvc-basic/tempdata", "mvc-basic/viewbag-viewdata"],
      a: [
        { table: { head: ["", "`ViewData`", "`ViewBag`", "`TempData`"], rows: [
          ["Type", "`ViewDataDictionary`", "`dynamic`", "`TempDataDictionary`"],
          ["Checked at", "Runtime (needs cast)", "Runtime (no cast)", "Runtime (needs cast)"],
          ["Lifetime", "Current request", "Current request", "Current **and next** request"],
          ["Survives a redirect", "No", "No", "**Yes**"],
          ["Backed by", "Request", "Same dictionary as `ViewData`", "**Session** by default"],
          ["Typical use", "Small extras", "Small extras", "Message across POST-Redirect-GET"]
        ] } },
        { code: `ViewData["Total"] = 42;
var a = ViewBag.Total;              // 42 — same storage

ViewBag.Message = "hello";
var b = ViewData["Message"];        // "hello"

TempData["Flash"] = "Saved";        // still there after RedirectToAction`, lang: "csharp" },
        { note: "The strongest answer ends with: for anything meaningful I use a **strongly typed view model**, and keep these three for incidental extras and flash messages.", kind: "tip" }
      ]
    },

    {
      id: "pass-data-controller-to-view",
      q: "How do you pass data from a Controller to a View?",
      tldr: "Pass a strongly typed model to View(model) — that is the primary mechanism; ViewBag, ViewData and TempData handle small extras.",
      tags: ["views", "state"],
      a: [
        { ol: [
          "**Strongly typed model** — `return View(model)` with `@model` in the view. Compile-time checked, IntelliSense, refactor-safe. **Default choice.**",
          "**`ViewBag`** — dynamic, for one-off extras such as a page title.",
          "**`ViewData`** — the same storage through a dictionary.",
          "**`TempData`** — when the data must survive a redirect.",
          "**Session** — for data that must live across many requests.",
          "**View components / child actions** — when a page region fetches its own data."
        ] },
        { code: `public ActionResult Dashboard()
{
    var model = new DashboardViewModel
    {
        Orders = _orders.Recent(10),
        Revenue = _orders.RevenueThisMonth()
    };

    ViewBag.Title = "Dashboard";        // incidental extra
    return View(model);                 // the real payload
}`, lang: "csharp" },
        { code: `@model DashboardViewModel

<h2>@ViewBag.Title</h2>
<p>Revenue: @Model.Revenue.ToString("C")</p>

@foreach (var o in Model.Orders) { <div>@o.Reference</div> }`, lang: "razor" }
      ]
    },

    {
      id: "action-filters",
      q: "What are Action Filters in ASP.NET MVC?",
      tldr: "Attributes that run code before and after an action executes — the built-in hook for cross-cutting concerns like logging, caching and validation.",
      tags: ["filters"],
      seeAlso: ["mvc-intermediate/filters", "mvc-advanced/custom-action-filter"],
      a: [
        { ul: [
          "Derive from `ActionFilterAttribute` and override `OnActionExecuting`, `OnActionExecuted`, `OnResultExecuting` or `OnResultExecuted`.",
          "Apply at **action**, **controller** or **global** level (`GlobalFilters.Filters` in `FilterConfig`).",
          "Execution order: **global → controller → action** on the way in, reversed on the way out. `Order` overrides it.",
          "Setting `filterContext.Result` in `OnActionExecuting` **short-circuits** the action.",
          "Built-in examples: `[OutputCache]`, `[HandleError]`, `[Authorize]`, `[ValidateAntiForgeryToken]`, `[RequireHttps]`."
        ] },
        { code: `public class LogActionAttribute : ActionFilterAttribute
{
    public override void OnActionExecuting(ActionExecutingContext filterContext)
    {
        var action = filterContext.ActionDescriptor.ActionName;
        Trace.WriteLine($"-> {action}");

        if (!filterContext.HttpContext.Request.IsSecureConnection)
            filterContext.Result = new HttpStatusCodeResult(403);   // short-circuit
    }

    public override void OnActionExecuted(ActionExecutedContext filterContext)
        => Trace.WriteLine($"<- {filterContext.ActionDescriptor.ActionName}");
}

[LogAction]
public class OrdersController : Controller { }`, lang: "csharp" }
      ]
    },

    {
      id: "layout-cshtml",
      q: "What is the role of the _Layout.cshtml file?",
      tldr: "It is the shared page template — the HTML shell, navigation and script references — into which each view is rendered at @RenderBody().",
      tags: ["views", "razor"],
      a: [
        { ul: [
          "`@RenderBody()` marks where the child view's content is injected. Exactly one per layout.",
          "`@RenderSection(\"Scripts\", required: false)` defines an optional named slot a view can fill with `@section`.",
          "**`_ViewStart.cshtml`** sets the layout for every view in its folder and below, so individual views need not.",
          "A view can override with `Layout = \"~/Views/Shared/_Print.cshtml\";` or disable it with `Layout = null;`.",
          "Layouts can nest — a layout may itself specify a parent layout.",
          "It is the MVC equivalent of a Web Forms master page."
        ] },
        { code: `<!DOCTYPE html>
<html>
<head>
    <title>@ViewBag.Title - Shop</title>
    @Styles.Render("~/Content/css")
</head>
<body>
    @Html.Partial("_Navigation")

    <div class="container">
        @RenderBody()
    </div>

    @Scripts.Render("~/bundles/jquery")
    @RenderSection("Scripts", required: false)
</body>
</html>`, lang: "razor" },
        { code: `@{ Layout = "~/Views/Shared/_Layout.cshtml"; }`, lang: "razor", caption: "_ViewStart.cshtml" }
      ]
    },

    {
      id: "custom-route",
      q: "How do you create a custom route in ASP.NET MVC?",
      tldr: "Call routes.MapRoute in RouteConfig with your own URL template, defaults and constraints — registered before the default route — or use attribute routing on the action.",
      tags: ["routing"],
      seeAlso: ["mvc-basic/routing", "mvc-intermediate/attribute-routing", "mvc-advanced/custom-route-constraints"],
      a: [
        { code: `public static void RegisterRoutes(RouteCollection routes)
{
    routes.IgnoreRoute("{resource}.axd/{*pathInfo}");

    // /blog/2024/03/hello-world
    routes.MapRoute(
        name: "BlogPost",
        url: "blog/{year}/{month}/{slug}",
        defaults: new { controller = "Blog", action = "Post" },
        constraints: new { year = @"\\d{4}", month = @"\\d{2}" }
    );

    // /archive/anything/deep/here
    routes.MapRoute(
        name: "Archive",
        url: "archive/{*path}",                     // catch-all
        defaults: new { controller = "Archive", action = "Browse" }
    );

    routes.MapRoute(
        name: "Default",
        url: "{controller}/{action}/{id}",
        defaults: new { controller = "Home", action = "Index",
                        id = UrlParameter.Optional }
    );
}`, lang: "csharp" },
        { code: `// Attribute routing — enable with routes.MapMvcAttributeRoutes()
[RoutePrefix("blog")]
public class BlogController : Controller
{
    [Route("{year:int:length(4)}/{month:int:range(1,12)}/{slug}")]
    public ActionResult Post(int year, int month, string slug) => View();
}`, lang: "csharp" },
        { ul: [
          "**Register specific routes before the default one** — the first match wins.",
          "Built-in constraints: `int`, `bool`, `datetime`, `length`, `min`, `max`, `range`, `alpha`, `regex`.",
          "`{*path}` is a catch-all and must be the last segment.",
          "Attribute routing keeps the URL next to the action and is generally clearer for APIs and non-uniform URLs."
        ] }
      ]
    },

    {
      id: "action-return-types",
      q: "What are the different return types of a controller action method?",
      tldr: "Everything derives from ActionResult — ViewResult, PartialViewResult, RedirectResult, JsonResult, ContentResult, FileResult, HttpStatusCodeResult and EmptyResult.",
      tags: ["controllers"],
      a: [
        { table: { head: ["Type", "Helper", "Sends"], rows: [
          ["`ViewResult`", "`View()`", "A rendered Razor view"],
          ["`PartialViewResult`", "`PartialView()`", "A view fragment, no layout"],
          ["`RedirectResult`", "`Redirect(url)`", "302 to a URL"],
          ["`RedirectToRouteResult`", "`RedirectToAction()`", "302 built from routing"],
          ["`JsonResult`", "`Json(obj)`", "JSON"],
          ["`ContentResult`", "`Content(\"text\")`", "Raw text with a content type"],
          ["`FileResult`", "`File(...)`", "A file download or stream"],
          ["`HttpStatusCodeResult`", "`HttpNotFound()`, `new HttpStatusCodeResult(403)`", "A bare status code"],
          ["`HttpUnauthorizedResult`", "—", "401, triggers the login redirect"],
          ["`EmptyResult`", "—", "Nothing"]
        ] } },
        { code: `public ActionResult Index()        => View();
public ActionResult Card(int id)   => PartialView("_Card", _repo.Find(id));
public ActionResult Save()         => RedirectToAction("Index");
public ActionResult Data()         => Json(_repo.All(), JsonRequestBehavior.AllowGet);
public ActionResult Ping()         => Content("pong", "text/plain");
public ActionResult Report()       => File(bytes, "application/pdf", "report.pdf");
public ActionResult Missing()      => HttpNotFound();

// async actions return Task<ActionResult>
public async Task<ActionResult> Details(int id) => View(await _repo.FindAsync(id));`, lang: "csharp" },
        { note: "`Json()` refuses GET requests by default — you must pass `JsonRequestBehavior.AllowGet`. That guard exists because of a JSON hijacking attack on older browsers.", kind: "warn" }
      ]
    },

    {
      id: "bundling-minification",
      q: "Explain the concept of Bundling and Minification in ASP.NET MVC.",
      tldr: "Bundling combines many CSS/JS files into one request and minification strips whitespace and shortens names — together they cut request count and payload size.",
      tags: ["performance"],
      a: [
        { code: `public class BundleConfig
{
    public static void RegisterBundles(BundleCollection bundles)
    {
        bundles.Add(new ScriptBundle("~/bundles/jquery").Include(
                    "~/Scripts/jquery-{version}.js"));

        bundles.Add(new ScriptBundle("~/bundles/app").Include(
                    "~/Scripts/site.js",
                    "~/Scripts/orders.js"));

        bundles.Add(new StyleBundle("~/Content/css").Include(
                    "~/Content/bootstrap.css",
                    "~/Content/site.css"));

        BundleTable.EnableOptimizations = true;   // force it on in Debug too
    }
}`, lang: "csharp" },
        { code: `@Styles.Render("~/Content/css")
@Scripts.Render("~/bundles/jquery", "~/bundles/app")`, lang: "razor" },
        { ul: [
          "**Bundling** reduces the number of HTTP round trips; **minification** reduces bytes on the wire.",
          "Enabled automatically when `<compilation debug=\"false\">`; in Debug the individual files are rendered so they stay debuggable.",
          "A **cache-busting `?v=` hash** is appended to the bundle URL, so a change invalidates the browser cache immediately.",
          "`{version}` resolves the jQuery version automatically; `.min` files are preferred when present.",
          "**Order matters** — dependencies must be included before the files that use them."
        ] },
        { note: "Modern practice has largely moved on: HTTP/2 multiplexing removes most of the request-count benefit, and Core uses **webpack/vite** or the bundler-minifier tooling instead. Still worth knowing for MVC 5 codebases.", kind: "tip" }
      ]
    },

    {
      id: "error-handling",
      q: "How do you handle errors in ASP.NET MVC?",
      tldr: "Layer it: try/catch for expected failures, the [HandleError] filter or a custom exception filter for controllers, Application_Error as the backstop, and customErrors/httpErrors for status pages.",
      tags: ["errors"],
      seeAlso: ["mvc-intermediate/handle-exceptions", "mvc-advanced/custom-error-handling"],
      a: [
        { ol: [
          "**`try`/`catch`** in the action for failures you can genuinely recover from.",
          "**`[HandleError]`** filter — renders `~/Views/Shared/Error.cshtml` for unhandled exceptions. Requires `customErrors` to be on.",
          "**Custom exception filter** — implement `IExceptionFilter` to log and choose a result. Register globally.",
          "**`Application_Error`** in `Global.asax` — the last managed backstop, catches anything the filters missed.",
          "**`<customErrors>` and `<httpErrors>`** — friendly pages for HTTP status codes such as 404."
        ] },
        { code: `public class LogAndShowErrorAttribute : FilterAttribute, IExceptionFilter
{
    public void OnException(ExceptionContext ctx)
    {
        if (ctx.ExceptionHandled) return;

        Logger.Error(ctx.Exception);

        ctx.Result = ctx.HttpContext.Request.IsAjaxRequest()
            ? (ActionResult)new JsonResult
              {
                  Data = new { error = "Something went wrong" },
                  JsonRequestBehavior = JsonRequestBehavior.AllowGet
              }
            : new ViewResult { ViewName = "Error" };

        ctx.ExceptionHandled = true;
        ctx.HttpContext.Response.StatusCode = 500;
        ctx.HttpContext.Response.TrySkipIisCustomErrors = true;
    }
}

// FilterConfig.cs
filters.Add(new LogAndShowErrorAttribute());`, lang: "csharp" },
        { code: `<system.web>
  <customErrors mode="RemoteOnly" defaultRedirect="~/Error">
    <error statusCode="404" redirect="~/Error/NotFound" />
  </customErrors>
</system.web>`, lang: "xml" },
        { note: "`[HandleError]` does **not** log anything and does nothing for AJAX requests — it just swaps in a view. Always pair it with real logging.", kind: "warn" }
      ]
    },

    {
      id: "mvc-vs-webforms",
      q: "What is the difference between ASP.NET MVC and Web Forms?",
      tldr: "Web Forms is an event-driven, stateful page model with server controls and ViewState; MVC is a stateless, request-driven model with full control over the HTML and far better testability.",
      tags: ["comparison"],
      a: [
        { table: { head: ["", "Web Forms", "MVC"], rows: [
          ["Model", "Event-driven, page lifecycle", "Request/response, action-based"],
          ["State", "**ViewState**, postbacks", "Stateless — no ViewState"],
          ["Markup", "Server controls generate HTML", "You write the HTML"],
          ["URLs", "Map to `.aspx` files", "Routed to controller actions"],
          ["Separation", "Code-behind, tightly coupled to the page", "Model / View / Controller"],
          ["Testability", "Hard — page lifecycle and `HttpContext`", "Controllers are plain testable classes"],
          ["Client IDs", "Mangled (`ctl00_...`)", "Exactly what you wrote"],
          ["Learning curve", "Fast for drag-and-drop forms", "Steeper, more explicit"],
          ["Best for", "Legacy line-of-business apps, RAD forms", "Modern web apps, SPAs, REST APIs, SEO"]
        ] } },
        { ul: [
          "**ViewState** is the crux: it round-trips control state in a hidden field, which makes the event model work but bloats the page.",
          "MVC's stateless design suits **REST, AJAX and SEO-friendly URLs** far better.",
          "Both run on ASP.NET and can coexist in the same project.",
          "**Neither is the modern default** — new work goes to ASP.NET Core MVC, Razor Pages or Blazor."
        ] }
      ]
    },

    {
      id: "ajax-in-mvc",
      q: "How do you use AJAX in ASP.NET MVC?",
      tldr: "Have an action return JsonResult or PartialViewResult, then call it with jQuery/fetch — or use the Ajax.* helpers with unobtrusive AJAX.",
      tags: ["ajax", "javascript"],
      a: [
        { code: `[HttpGet]
public ActionResult Search(string term)
{
    var results = _repo.Search(term);
    return Json(results, JsonRequestBehavior.AllowGet);   // required for GET
}

[HttpPost]
[ValidateAntiForgeryToken]
public ActionResult Row(int id)
    => PartialView("_ProductRow", _repo.Find(id));        // HTML fragment`, lang: "csharp" },
        { code: `// JSON
fetch('/Products/Search?term=' + encodeURIComponent(term))
    .then(r => r.json())
    .then(data => render(data));

// HTML fragment swapped into the page
$.post('/Products/Row', {
    id: 5,
    __RequestVerificationToken: $('input[name="__RequestVerificationToken"]').val()
}, function (html) { $('#row-5').replaceWith(html); });`, lang: "text", caption: "Client side" },
        { ul: [
          "Return **`JsonResult`** for data the client renders, **`PartialViewResult`** for server-rendered HTML you drop into the DOM.",
          "`Request.IsAjaxRequest()` lets one action serve both a full view and a partial.",
          "**Anti-forgery tokens still apply** to AJAX POSTs — send the token in the payload or an `X-CSRF-TOKEN` header.",
          "`Json()` requires `JsonRequestBehavior.AllowGet` for GET requests.",
          "The `Ajax.BeginForm` / `Ajax.ActionLink` helpers need `jquery.unobtrusive-ajax.js` and are mostly superseded by writing the JavaScript directly."
        ] }
      ]
    }

  ]
});
