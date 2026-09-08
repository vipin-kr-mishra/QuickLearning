/* ASP.NET MVC — Intermediate. 30 questions. See data/manifest.js for the guide. */
QL.register({
  id: "mvc-intermediate",
  topic: "ASP.NET MVC",
  level: "Intermediate",
  short: "MVC Intermediate",
  accent: "blue",
  desc: "Wiring a real application: EF, dependency injection, areas, filters, view models, custom validation, caching, uploads and AJAX responses.",
  questions: [

    {
      id: "routeconfig",
      q: "What is the role of the RouteConfig.cs file?",
      tldr: "It lives in App_Start and holds RegisterRoutes, where every route template is added to the RouteTable — called once from Application_Start.",
      tags: ["routing", "configuration"],
      seeAlso: ["mvc-basic/routing", "mvc-intermediate/application-start"],
      a: [
        { ul: [
          "It is a **convention, not a requirement** — the routes could be registered anywhere, but the template puts them here so startup stays readable.",
          "`RegisterRoutes(RouteTable.Routes)` is invoked from `Application_Start` in `Global.asax`.",
          "`IgnoreRoute` excludes paths from routing — `.axd` handlers, and often static file paths.",
          "`MapMvcAttributeRoutes()` enables attribute routing; call it **before** the convention-based routes.",
          "Order is significant: the first matching route wins."
        ] },
        { code: `public class RouteConfig
{
    public static void RegisterRoutes(RouteCollection routes)
    {
        routes.IgnoreRoute("{resource}.axd/{*pathInfo}");

        routes.MapMvcAttributeRoutes();          // attribute routes first

        routes.MapRoute(
            name: "Default",
            url: "{controller}/{action}/{id}",
            defaults: new { controller = "Home", action = "Index",
                            id = UrlParameter.Optional },
            namespaces: new[] { "Shop.Controllers" }   // resolves duplicate names
        );
    }
}`, lang: "csharp" },
        { note: "In **ASP.NET Core** this moves into `Program.cs` as `app.MapControllerRoute(...)`, or disappears entirely in favour of attribute routing.", kind: "tip" }
      ]
    },

    {
      id: "entity-framework",
      q: "How do you use Entity Framework with ASP.NET MVC?",
      tldr: "Define entities and a DbContext, register the context per request, query it with LINQ from a service or repository, and project to view models before returning.",
      tags: ["data", "ef"],
      a: [
        { code: `public class ShopContext : DbContext
{
    public ShopContext() : base("name=ShopContext") { }

    public DbSet<Product> Products { get; set; }
    public DbSet<Category> Categories { get; set; }

    protected override void OnModelCreating(DbModelBuilder mb)
    {
        mb.Entity<Product>().Property(p => p.Name).IsRequired().HasMaxLength(100);
    }
}

public class ProductsController : Controller
{
    private readonly ShopContext _db;
    public ProductsController(ShopContext db) => _db = db;

    public async Task<ActionResult> Index(string q)
    {
        var model = await _db.Products
            .AsNoTracking()                                  // read-only: faster
            .Include(p => p.Category)                        // avoid N+1
            .Where(p => q == null || p.Name.Contains(q))
            .OrderBy(p => p.Name)
            .Select(p => new ProductListItem                 // project, do not
            {                                                //  return entities
                Id = p.Id, Name = p.Name, Category = p.Category.Name
            })
            .ToListAsync();

        return View(model);
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing) _db.Dispose();
        base.Dispose(disposing);
    }
}`, lang: "csharp" },
        { ul: [
          "**Approaches**: Code First (classes drive the schema, with migrations), Database First, Model First. Code First is the norm.",
          "**One DbContext per request** — it is a unit of work, is not thread-safe, and must be disposed.",
          "**`AsNoTracking()`** for read-only queries: no change tracker, noticeably faster.",
          "**`Include`** eagerly loads navigation properties, avoiding the N+1 query problem that lazy loading causes in a loop.",
          "**Project to a view model** in the query — never serialise entities directly (circular references, over-fetching, over-posting).",
          "Migrations: `Enable-Migrations`, `Add-Migration Name`, `Update-Database` (or `dotnet ef` in Core)."
        ] },
        { note: "The N+1 problem is the most common EF interview follow-up: a list page renders 50 rows and each one lazily loads its category — 51 queries. `Include` or a projection reduces it to one.", kind: "warn" }
      ]
    },

    {
      id: "dependency-injection",
      q: "What is Dependency Injection and how is it implemented in ASP.NET MVC?",
      tldr: "DI supplies a class's dependencies from outside instead of letting it construct them; in MVC 5 you plug a container in via IDependencyResolver, and in Core it is built in.",
      tags: ["di", "architecture"],
      seeAlso: ["mvc-advanced/inversion-of-control"],
      a: [
        { p: "Without DI a controller does `new SqlProductRepository()` — it is welded to one implementation and cannot be unit tested. With DI it receives an `IProductRepository` and neither knows nor cares which one." },
        { code: `public class ProductsController : Controller
{
    private readonly IProductService _service;
    private readonly ILogger _logger;

    // Constructor injection — the clearest and most common form
    public ProductsController(IProductService service, ILogger logger)
    {
        _service = service;
        _logger = logger;
    }
}`, lang: "csharp" },
        { code: `// MVC 5 with Unity — wiring the container into the framework
var container = new UnityContainer();
container.RegisterType<IProductService, ProductService>(
    new HierarchicalLifetimeManager());                 // per request
container.RegisterType<ShopContext>(new PerRequestLifetimeManager());

DependencyResolver.SetResolver(new UnityDependencyResolver(container));`, lang: "csharp" },
        { code: `// ASP.NET Core — built in, no third-party container required
builder.Services.AddScoped<IProductService, ProductService>();   // per request
builder.Services.AddSingleton<ICache, MemoryCache>();            // one instance
builder.Services.AddTransient<IEmailSender, SmtpSender>();       // every time
builder.Services.AddDbContext<ShopContext>(o => o.UseSqlServer(cs));`, lang: "csharp" },
        { table: { head: ["Lifetime", "Instance per", "Typical use"], rows: [
          ["Transient", "Every resolution", "Cheap, stateless services"],
          ["Scoped", "HTTP request", "`DbContext`, unit of work"],
          ["Singleton", "Application", "Caches, configuration, HTTP clients"]
        ] } },
        { note: "The classic bug is a **captive dependency**: injecting a scoped `DbContext` into a singleton. The singleton holds the first request's context forever. Containers in Core detect this and throw at startup.", kind: "warn" }
      ]
    },

    {
      id: "areas",
      q: "Explain the concept of Areas in ASP.NET MVC.",
      tldr: "An Area is a self-contained sub-application inside one project, with its own Controllers, Views, Models and route registration — used to keep large apps organised.",
      tags: ["organisation", "routing"],
      a: [
        { ul: [
          "**Right-click project → Add → Area** creates `/Areas/{Name}/` with `Controllers`, `Views`, `Models` and an `{Name}AreaRegistration.cs`.",
          "`AreaRegistration.RegisterAllAreas()` in `Application_Start` discovers and registers them.",
          "Each area gets a URL prefix: `/Admin/Products/Index`.",
          "Typical split: `Admin`, `Reports`, `Api` — or per business module.",
          "Linking **into** an area needs `area = \"Admin\"` in the route values; linking **out** needs `area = \"\"`."
        ] },
        { code: `public class AdminAreaRegistration : AreaRegistration
{
    public override string AreaName => "Admin";

    public override void RegisterArea(AreaRegistrationContext context)
    {
        context.MapRoute(
            name: "Admin_default",
            url: "Admin/{controller}/{action}/{id}",
            defaults: new { action = "Index", id = UrlParameter.Optional },
            namespaces: new[] { "Shop.Areas.Admin.Controllers" }
        );
    }
}`, lang: "csharp" },
        { code: `@Html.ActionLink("Admin", "Index", "Dashboard", new { area = "Admin" }, null)
@Html.ActionLink("Home", "Index", "Home", new { area = "" }, null)`, lang: "razor" },
        { note: "Always set `namespaces:` on both the area route and the default route. Without it, two `HomeController` classes in different areas produce an ambiguous-controller exception.", kind: "warn" }
      ]
    },

    {
      id: "custom-validation",
      q: "How do you implement custom validation in ASP.NET MVC?",
      tldr: "Derive from ValidationAttribute for a reusable rule, implement IValidatableObject for cross-property rules, or add errors directly with ModelState.AddModelError.",
      tags: ["validation"],
      seeAlso: ["mvc-basic/validation", "mvc-intermediate/model-validation"],
      a: [
        { p: "**1. Custom `ValidationAttribute` — reusable, works on any model:**" },
        { code: `public class MinimumAgeAttribute : ValidationAttribute, IClientValidatable
{
    private readonly int _minimumAge;
    public MinimumAgeAttribute(int minimumAge)
    {
        _minimumAge = minimumAge;
        ErrorMessage = $"You must be at least {minimumAge} years old.";
    }

    protected override ValidationResult IsValid(object value,
                                                ValidationContext context)
    {
        if (value is not DateTime dob) return ValidationResult.Success;

        var age = DateTime.Today.Year - dob.Year;
        if (dob > DateTime.Today.AddYears(-age)) age--;

        return age >= _minimumAge
            ? ValidationResult.Success
            : new ValidationResult(ErrorMessage, new[] { context.MemberName });
    }

    // Emits data-val-* so the rule also runs client-side
    public IEnumerable<ModelClientValidationRule> GetClientValidationRules(
        ModelMetadata metadata, ControllerContext context)
    {
        yield return new ModelClientValidationRule
        {
            ValidationType = "minimumage",
            ErrorMessage = ErrorMessage,
            ValidationParameters = { ["age"] = _minimumAge }
        };
    }
}

public class RegisterViewModel
{
    [MinimumAge(18)]
    public DateTime DateOfBirth { get; set; }
}`, lang: "csharp" },
        { p: "**2. `IValidatableObject` — rules that span several properties:**" },
        { code: `public class BookingViewModel : IValidatableObject
{
    public DateTime Start { get; set; }
    public DateTime End { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        if (End <= Start)
            yield return new ValidationResult(
                "End must be after start", new[] { nameof(End) });
    }
}`, lang: "csharp" },
        { p: "**3. In the controller — for rules that need a database or a service:**" },
        { code: `if (_repo.EmailExists(model.Email))
    ModelState.AddModelError(nameof(model.Email), "That email is taken.");`, lang: "csharp" },
        { note: "`[Remote]` is the fourth option — it validates a single field against a controller action by AJAX as the user types, which is how \"username already taken\" is usually done.", kind: "tip" }
      ]
    },

    {
      id: "application-start",
      q: "What is the purpose of the Application_Start method?",
      tldr: "It runs once when the application domain starts, and is where routes, filters, bundles, areas and container registration are set up.",
      tags: ["lifecycle", "configuration"],
      seeAlso: ["mvc-basic/global-asax"],
      a: [
        { ul: [
          "Fires **once per application domain**, on the very first request after start or recycle — not once per user and not once per request.",
          "It is the standard place for all one-time configuration.",
          "It runs again after an **app pool recycle**, a `web.config` edit, or a redeploy — so do not treat static state initialised here as permanent.",
          "Long work here delays the first request; consider warm-up (Application Initialization) if startup is heavy."
        ] },
        { code: `protected void Application_Start()
{
    AreaRegistration.RegisterAllAreas();
    GlobalConfiguration.Configure(WebApiConfig.Register);
    FilterConfig.RegisterGlobalFilters(GlobalFilters.Filters);
    RouteConfig.RegisterRoutes(RouteTable.Routes);
    BundleConfig.RegisterBundles(BundleTable.Bundles);

    DependencyResolver.SetResolver(new UnityDependencyResolver(BuildContainer()));
    Database.SetInitializer<ShopContext>(null);
    AutoMapperConfig.Initialize();
}`, lang: "csharp" },
        { note: "In **ASP.NET Core** this role is split: service registration on `builder.Services`, and pipeline configuration on `app` in `Program.cs`.", kind: "tip" }
      ]
    },

    {
      id: "automapper",
      q: "How do you use AutoMapper in ASP.NET MVC?",
      tldr: "Define mapping profiles from entity to view model once at startup, then call Map<TDestination> instead of writing property-by-property assignment.",
      tags: ["mapping", "tooling"],
      a: [
        { code: `public class MappingProfile : Profile
{
    public MappingProfile()
    {
        CreateMap<Product, ProductListItem>()
            .ForMember(d => d.Category, o => o.MapFrom(s => s.Category.Name))
            .ForMember(d => d.PriceText, o => o.MapFrom(s => s.Price.ToString("C")));

        CreateMap<ProductEditViewModel, Product>()
            .ForMember(d => d.Id, o => o.Ignore());     // never bind the key
    }
}

// Startup
var config = new MapperConfiguration(cfg => cfg.AddProfile<MappingProfile>());
config.AssertConfigurationIsValid();                    // fail fast at startup
IMapper mapper = config.CreateMapper();`, lang: "csharp" },
        { code: `public ActionResult Index()
{
    var products = _db.Products.Include(p => p.Category).ToList();
    var model = _mapper.Map<List<ProductListItem>>(products);
    return View(model);
}

// Better: project in the database, selecting only the needed columns
var model = _db.Products
    .ProjectTo<ProductListItem>(_mapper.ConfigurationProvider)
    .ToList();`, lang: "csharp" },
        { ul: [
          "It removes repetitive mapping code between entities and view models.",
          "**`AssertConfigurationIsValid()`** at startup catches unmapped destination members immediately rather than at runtime.",
          "**`ProjectTo`** works with `IQueryable`, so the mapping becomes part of the SQL `SELECT` — far better than loading full entities and mapping in memory.",
          "Inject `IMapper` rather than using the old static `Mapper` API.",
          "Downside: mappings are implicit, so a renamed property can silently stop mapping. Some teams prefer explicit extension methods for exactly that reason."
        ] }
      ]
    },

    {
      id: "attribute-routing",
      q: "Explain the concept of Attribute Routing in ASP.NET MVC.",
      tldr: "Routes declared as attributes directly on controllers and actions, so the URL sits next to the code it maps to — enabled with MapMvcAttributeRoutes().",
      tags: ["routing"],
      seeAlso: ["mvc-basic/custom-route", "mvc-advanced/custom-route-constraints"],
      a: [
        { code: `routes.MapMvcAttributeRoutes();   // in RouteConfig, before convention routes`, lang: "csharp" },
        { code: `[RoutePrefix("api/products")]
public class ProductsController : Controller
{
    [Route("")]                                        // GET /api/products
    public ActionResult Index() => View();

    [Route("{id:int:min(1)}")]                         // GET /api/products/42
    public ActionResult Details(int id) => View();

    [Route("category/{name:alpha}/page/{page:int=1}")] // default value
    public ActionResult ByCategory(string name, int page) => View();

    [Route("~/legacy/products")]                       // ~ escapes the prefix
    public ActionResult Legacy() => View();

    [HttpPost, Route("{id:int}/archive", Name = "ArchiveProduct")]
    public ActionResult Archive(int id) => RedirectToAction("Index");
}`, lang: "csharp" },
        { table: { head: ["Constraint", "Matches"], rows: [
          ["`{id:int}`", "An integer"],
          ["`{id:int:min(1)}`", "An integer of at least 1"],
          ["`{name:alpha}`", "Letters only"],
          ["`{code:length(6)}`", "Exactly 6 characters"],
          ["`{date:datetime}`", "A parseable date"],
          ["`{slug:regex(^[a-z-]+$)}`", "A regular expression"],
          ["`{page:int=1}`", "Optional with a default"],
          ["`{id?}`", "Optional"]
        ] } },
        { ul: [
          "**Advantages**: the URL is visible where the action is defined, non-uniform URLs are easy, and versioned or REST-style APIs are far cleaner.",
          "**Disadvantages**: routes are scattered across the codebase rather than listed in one file.",
          "The two styles **coexist** — attribute routes are matched first.",
          "`Name = \"...\"` lets you generate the URL later with `Url.RouteUrl(\"ArchiveProduct\", new { id })`."
        ] }
      ]
    },

    {
      id: "file-uploads",
      q: "How do you handle file uploads in ASP.NET MVC?",
      tldr: "Set the form to multipart/form-data, accept an HttpPostedFileBase parameter, validate size and content type, then save outside the web root with a generated name.",
      tags: ["forms", "security"],
      a: [
        { code: `@using (Html.BeginForm("Upload", "Files", FormMethod.Post,
                       new { enctype = "multipart/form-data" }))
{
    @Html.AntiForgeryToken()
    <input type="file" name="file" accept=".pdf,.png,.jpg" />
    <button type="submit">Upload</button>
}`, lang: "razor" },
        { code: `private static readonly string[] Allowed = { ".pdf", ".png", ".jpg" };
private const int MaxBytes = 5 * 1024 * 1024;

[HttpPost]
[ValidateAntiForgeryToken]
public ActionResult Upload(HttpPostedFileBase file)
{
    if (file == null || file.ContentLength == 0)
    {
        ModelState.AddModelError("file", "Please choose a file.");
        return View("Index");
    }

    if (file.ContentLength > MaxBytes)
    {
        ModelState.AddModelError("file", "File must be 5 MB or less.");
        return View("Index");
    }

    var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
    if (!Allowed.Contains(ext))
    {
        ModelState.AddModelError("file", "That file type is not allowed.");
        return View("Index");
    }

    // Never reuse the client's filename — generate your own
    var storedName = $"{Guid.NewGuid():N}{ext}";
    var path = Path.Combine(Server.MapPath("~/App_Data/uploads"), storedName);
    file.SaveAs(path);

    return RedirectToAction("Index");
}

// Several files
public ActionResult UploadMany(IEnumerable<HttpPostedFileBase> files) { ... }`, lang: "csharp" },
        { code: `<system.web>
  <httpRuntime maxRequestLength="10240" executionTimeout="300" />
</system.web>
<system.webServer>
  <security><requestFiltering>
    <requestLimits maxAllowedContentLength="10485760" />
  </requestFiltering></security>
</system.webServer>`, lang: "xml", caption: "Both limits must be raised — maxRequestLength is in KB, maxAllowedContentLength in bytes" },
        { note: "Security essentials: **never trust `FileName`** (path traversal), **never trust `ContentType`** (client-supplied), store outside the web root or in blob storage so uploads can never be executed, and check the actual magic bytes if the file type matters.", kind: "warn" }
      ]
    },

    {
      id: "html-renderaction",
      q: "What is the purpose of the Html.RenderAction method?",
      tldr: "It invokes a child action and writes its output straight into the response — used when a page region needs to fetch its own data rather than receive it from the parent.",
      tags: ["views", "child-actions"],
      seeAlso: ["mvc-intermediate/partial-vs-renderpartial", "mvc-intermediate/view-components"],
      a: [
        { ul: [
          "`Html.Action(...)` **returns** an `MvcHtmlString`; `Html.RenderAction(...)` **writes directly** to the output stream and returns `void`.",
          "`RenderAction` is faster because it skips building an intermediate string — but it must be called inside a code block: `@{ Html.RenderAction(...); }`.",
          "The difference from a partial view: a partial renders a model **you supply**; a child action runs a **controller action** that fetches its own data.",
          "Mark the target with **`[ChildActionOnly]`** so it cannot be requested directly by URL.",
          "Typical uses: a navigation menu, a shopping-cart summary, a login widget — anything on every page that needs its own query."
        ] },
        { code: `public class CartController : Controller
{
    [ChildActionOnly]
    [OutputCache(Duration = 60, VaryByCustom = "user")]
    public ActionResult Summary()
    {
        var model = _cart.GetSummary(User.Identity.Name);
        return PartialView("_CartSummary", model);
    }
}`, lang: "csharp" },
        { code: `@* Writes directly — no intermediate string *@
@{ Html.RenderAction("Summary", "Cart"); }

@* Returns a string — assignable, but slower *@
@Html.Action("Summary", "Cart")`, lang: "razor" },
        { note: "In **ASP.NET Core** child actions were removed. **View Components** are the replacement and are better: no full controller pipeline, and they are async by default.", kind: "tip" }
      ]
    },

    {
      id: "role-based-authorization",
      q: "How do you implement role-based authorization in ASP.NET MVC?",
      tldr: "Assign users to roles, then restrict access with [Authorize(Roles = \"Admin\")] on controllers or actions, and check User.IsInRole in views.",
      tags: ["security", "auth"],
      seeAlso: ["mvc-intermediate/authorize-attribute", "mvc-advanced/custom-authorization-filter"],
      a: [
        { code: `// Creating roles and assigning users (ASP.NET Identity)
var roleManager = new RoleManager<IdentityRole>(new RoleStore<IdentityRole>(db));
if (!roleManager.RoleExists("Admin"))
    roleManager.Create(new IdentityRole("Admin"));

userManager.AddToRole(userId, "Admin");`, lang: "csharp" },
        { code: `[Authorize(Roles = "Admin")]                     // whole controller
public class AdminController : Controller
{
    public ActionResult Index() => View();

    [Authorize(Roles = "Admin,SuperAdmin")]      // OR — either role is enough
    public ActionResult Users() => View();

    [AllowAnonymous]                              // opt back out
    public ActionResult Public() => View();
}

// AND — stack the attributes, both must pass
[Authorize(Roles = "Admin")]
[Authorize(Roles = "Finance")]
public ActionResult Payroll() => View();`, lang: "csharp" },
        { code: `@if (User.IsInRole("Admin"))
{
    @Html.ActionLink("Delete", "Delete", new { id = Model.Id })
}`, lang: "razor" },
        { ul: [
          "Comma-separated roles inside one attribute mean **OR**; two stacked attributes mean **AND**.",
          "Roles come from the authentication cookie's claims, so **role changes only take effect after re-login** unless you refresh the cookie.",
          "Hiding a link in the view is **not** security — the action must still be protected.",
          "For anything more granular than roles, use **claims** or **policy-based authorisation** (`[Authorize(Policy = \"CanApprove\")]` in Core)."
        ] },
        { note: "Roles get unwieldy fast. Once you hit \"Admins can edit, but only in their own region\", you want claims or a permission model rather than more roles.", kind: "tip" }
      ]
    },

    {
      id: "actionresult-class",
      q: "What is the purpose of the ActionResult class?",
      tldr: "It is the abstract base for everything an action can return — an object that describes the response, which MVC executes after the action completes.",
      tags: ["controllers"],
      seeAlso: ["mvc-basic/action-return-types"],
      a: [
        { ul: [
          "It implements the **Command pattern**: the action decides *what* the response is, and `ExecuteResult(ControllerContext)` performs it later.",
          "That separation is what makes controllers **unit testable** — a test asserts on the returned `ViewResult` without any HTTP involved.",
          "Returning the base type `ActionResult` lets one action return different result types on different paths.",
          "You can create your own by deriving from `ActionResult` and overriding `ExecuteResult`."
        ] },
        { code: `public class CsvResult : ActionResult
{
    private readonly IEnumerable<string[]> _rows;
    private readonly string _fileName;

    public CsvResult(IEnumerable<string[]> rows, string fileName)
        => (_rows, _fileName) = (rows, fileName);

    public override void ExecuteResult(ControllerContext context)
    {
        var response = context.HttpContext.Response;
        response.ContentType = "text/csv";
        response.AddHeader("Content-Disposition",
            $"attachment; filename=\\"{_fileName}\\"");

        foreach (var row in _rows)
            response.Write(string.Join(",", row) + Environment.NewLine);
    }
}

public ActionResult Export() => new CsvResult(_repo.Rows(), "products.csv");`, lang: "csharp" },
        { code: `// Why it makes controllers testable
[Test]
public void Details_returns_404_for_missing_product()
{
    var result = _controller.Details(999);
    Assert.IsInstanceOf<HttpNotFoundResult>(result);
}`, lang: "csharp" }
      ]
    },

    {
      id: "caching-mvc",
      q: "How do you implement Caching in ASP.NET MVC?",
      tldr: "Output caching for whole action responses, donut/child-action caching for page regions, and data caching (MemoryCache, Redis) for the expensive objects behind them.",
      tags: ["performance", "caching"],
      a: [
        { table: { head: ["Kind", "Caches", "How"], rows: [
          ["**Output cache**", "The whole action response", "`[OutputCache(Duration = 60)]`"],
          ["**Child action cache**", "A page region", "`[OutputCache]` on a `[ChildActionOnly]` action"],
          ["**Data cache**", "Objects", "`MemoryCache`, `HttpRuntime.Cache`, `IMemoryCache`"],
          ["**Distributed cache**", "Objects, shared", "Redis, SQL Server"],
          ["**Client / proxy**", "In the browser or CDN", "`Location = OutputCacheLocation.Client`"]
        ] } },
        { code: `[OutputCache(Duration = 300, VaryByParam = "id", Location = OutputCacheLocation.Server)]
public ActionResult Details(int id) => View(_repo.Find(id));

// Shared settings, declared once in web.config
[OutputCache(CacheProfile = "Hourly")]
public ActionResult Report() => View();

// Never cache a personalised page on a shared proxy
[OutputCache(Duration = 60, VaryByCustom = "user",
             Location = OutputCacheLocation.Server)]
public ActionResult Dashboard() => View();`, lang: "csharp" },
        { code: `<caching>
  <outputCacheSettings>
    <outputCacheProfiles>
      <add name="Hourly" duration="3600" varyByParam="*" />
    </outputCacheProfiles>
  </outputCacheSettings>
</caching>`, lang: "xml" },
        { code: `// Data caching with a factory
public IEnumerable<Category> GetCategories()
{
    if (HttpRuntime.Cache["categories"] is List<Category> cached) return cached;

    var list = _db.Categories.AsNoTracking().ToList();
    HttpRuntime.Cache.Insert("categories", list, null,
        DateTime.UtcNow.AddMinutes(30), Cache.NoSlidingExpiration);
    return list;
}

// Override VaryByCustom in Global.asax
public override string GetVaryByCustomString(HttpContext ctx, string custom)
    => custom == "user" ? ctx.User.Identity.Name : base.GetVaryByCustomString(ctx, custom);`, lang: "csharp" },
        { note: "The dangerous mistake is caching a **personalised page** at `Location = Any` or `Downstream` — a proxy then serves one user's dashboard to everyone. Always `VaryByCustom` on identity, or keep it server-side.", kind: "warn" }
      ]
    },

    {
      id: "tempdata-dictionary",
      q: "What is the purpose of the TempData dictionary?",
      tldr: "To carry data across exactly one redirect — it is read-once, session-backed storage for POST-Redirect-GET messages.",
      tags: ["state"],
      seeAlso: ["mvc-basic/tempdata", "mvc-basic/viewbag-vs-viewdata-vs-tempdata"],
      a: [
        { ul: [
          "`ViewBag` and `ViewData` die with the request. A redirect is a **new request**, so only `TempData` survives it.",
          "Entries are marked for deletion **when read**, and removed at the end of that request.",
          "**`Peek(key)`** reads without marking; **`Keep(key)`** un-marks something already read.",
          "The default `SessionStateTempDataProvider` requires session. A cookie-based provider exists for stateless/farm scenarios.",
          "Keep it to small, simple values — a status message, an id. Large objects in session hurt scale-out."
        ] },
        { code: `[HttpPost]
public ActionResult Create(ProductViewModel model)
{
    if (!ModelState.IsValid) return View(model);

    var id = _service.Create(model);
    TempData["Message"]   = "Product created successfully.";
    TempData["NewProductId"] = id;
    return RedirectToAction("Index");
}

public ActionResult Index()
{
    var newId = TempData.Peek("NewProductId");   // read, but keep for later
    return View();
}`, lang: "csharp" },
        { note: "A subtlety worth knowing: if a request reads a `TempData` key and then redirects again, that value is gone. `Keep`/`Peek` exist precisely for chained redirects.", kind: "tip" }
      ]
    },

    {
      id: "view-components",
      q: "Explain the concept of View Components in ASP.NET Core MVC.",
      tldr: "A reusable, self-contained page region with its own logic and view — the ASP.NET Core replacement for child actions, invoked from a view and async by default.",
      tags: ["views", "core"],
      seeAlso: ["mvc-intermediate/html-renderaction", "mvc-advanced/viewcomponent-class"],
      a: [
        { ul: [
          "A class deriving from `ViewComponent` (or named `...ViewComponent`) with an `Invoke`/`InvokeAsync` method returning `IViewComponentResult`.",
          "The view lives at **`/Views/Shared/Components/{Name}/Default.cshtml`**.",
          "It supports **constructor injection**, so it can use services and a `DbContext` directly.",
          "Unlike a partial view it has **its own logic and data**; unlike a child action it does **not** run the full controller pipeline — no model binding, no filters, so it is faster.",
          "It **cannot** be reached by a URL, which is exactly what you want for a page fragment."
        ] },
        { code: `public class CartSummaryViewComponent : ViewComponent
{
    private readonly ICartService _cart;
    public CartSummaryViewComponent(ICartService cart) => _cart = cart;

    public async Task<IViewComponentResult> InvokeAsync(int maxItems = 5)
    {
        var model = await _cart.GetSummaryAsync(User.Identity.Name, maxItems);
        return View(model);       // /Views/Shared/Components/CartSummary/Default.cshtml
    }
}`, lang: "csharp" },
        { code: `@await Component.InvokeAsync("CartSummary", new { maxItems = 3 })

@* Or as a tag helper, after @addTagHelper *@
<vc:cart-summary max-items="3"></vc:cart-summary>`, lang: "razor" },
        { table: { head: ["", "Partial view", "View component"], rows: [
          ["Has its own logic", "No — you pass the model", "Yes"],
          ["Dependency injection", "No", "Yes, via the constructor"],
          ["Async", "Not really", "Yes, `InvokeAsync`"],
          ["Reachable by URL", "No", "No"],
          ["Best for", "Reusable markup", "A self-contained region with its own data"]
        ] } }
      ]
    },

    {
      id: "antiforgerytoken",
      q: "What is the use of the AntiForgeryToken in ASP.NET MVC?",
      tldr: "It defends against CSRF by pairing a hidden form token with a cookie token; [ValidateAntiForgeryToken] rejects any POST where the two do not match.",
      tags: ["security"],
      a: [
        { p: "**The attack**: you are logged in to your bank. A malicious page silently submits a form to the bank's transfer endpoint. The browser attaches your cookies, so the request looks authentic. CSRF exploits the fact that cookies travel automatically." },
        { p: "**The defence**: require a value the attacker's page cannot read or guess." },
        { code: `@using (Html.BeginForm())
{
    @Html.AntiForgeryToken()      @* hidden __RequestVerificationToken *@
    ...
}`, lang: "razor" },
        { code: `[HttpPost]
[ValidateAntiForgeryToken]
public ActionResult Transfer(TransferViewModel model) { ... }

// Apply to every POST at once
GlobalFilters.Filters.Add(new ValidateAntiForgeryTokenAttribute());`, lang: "csharp" },
        { code: `// AJAX: send the token explicitly
$.ajax({
    url: '/Orders/Delete',
    type: 'POST',
    headers: { 'RequestVerificationToken':
               $('input[name="__RequestVerificationToken"]').val() },
    data: { id: 5 }
});`, lang: "text" },
        { ul: [
          "Two tokens are issued — one **cookie**, one **hidden field** — and they must correspond. Same-origin policy stops the attacker reading either.",
          "Only needed on **state-changing** requests (POST/PUT/DELETE), not on GETs — which is a good reason never to change state on a GET.",
          "For AJAX, send the token in a header or in the payload.",
          "In a web farm, all servers need the same `<machineKey>` or the tokens will not validate."
        ] }
      ]
    },

    {
      id: "partial-views",
      q: "How do you use Partial Views in ASP.NET MVC?",
      tldr: "Create a _Name.cshtml fragment, render it with Html.Partial/RenderPartial for markup reuse, or return PartialView() from an action for AJAX updates.",
      tags: ["views"],
      seeAlso: ["mvc-basic/partial-view", "mvc-intermediate/partial-vs-renderpartial"],
      a: [
        { ol: [
          "Create the file, prefixed with an underscore by convention: `_ProductRow.cshtml`.",
          "Put it in the controller's view folder for local use, or `/Views/Shared/` to reuse it everywhere.",
          "Declare `@model` so it is strongly typed.",
          "Render it from a parent view, or return it from an action for AJAX."
        ] },
        { code: `@* /Views/Shared/_ProductRow.cshtml *@
@model Product
<tr>
    <td>@Model.Name</td>
    <td>@Model.Price.ToString("C")</td>
</tr>`, lang: "razor" },
        { code: `@* 1. Same model as the parent *@
@Html.Partial("_ProductRow")

@* 2. An explicit model *@
@Html.Partial("_ProductRow", item)

@* 3. Write directly to the stream — faster *@
@{ Html.RenderPartial("_ProductRow", item); }

@* 4. Extra data alongside the model *@
@Html.Partial("_ProductRow", item,
              new ViewDataDictionary { { "ShowActions", true } })`, lang: "razor" },
        { code: `// 5. Returned from an action, for AJAX
public ActionResult Row(int id) => PartialView("_ProductRow", _repo.Find(id));`, lang: "csharp" },
        { note: "A partial inherits the parent's `ViewData`/`ViewBag` by default. Passing a `ViewDataDictionary` explicitly **replaces** it rather than adding to it — a common surprise.", kind: "warn" }
      ]
    },

    {
      id: "authorize-attribute",
      q: "Explain the purpose of the Authorize attribute.",
      tldr: "It blocks a controller or action for unauthenticated users, and optionally restricts to named users or roles — returning 401, which the auth middleware turns into a login redirect.",
      tags: ["security", "filters"],
      seeAlso: ["mvc-intermediate/role-based-authorization", "mvc-advanced/custom-authorization-filter"],
      a: [
        { ul: [
          "It is an **authorisation filter** — the first filter type to run, before model binding and before the action.",
          "With no parameters it requires only that the user is **authenticated**.",
          "`Roles = \"Admin,Manager\"` means **any** of those roles; `Users = \"alice,bob\"` names specific accounts.",
          "Failure produces `HttpUnauthorizedResult` (401), which forms authentication converts into a redirect to the login page.",
          "**`[AllowAnonymous]`** opts a single action back out of a controller-level `[Authorize]`.",
          "Registering it globally in `FilterConfig` makes the whole site secure by default — the safest posture."
        ] },
        { code: `// Secure by default, then open specific actions
GlobalFilters.Filters.Add(new AuthorizeAttribute());

public class AccountController : Controller
{
    [AllowAnonymous]
    public ActionResult Login() => View();

    [AllowAnonymous]
    public ActionResult Register() => View();

    public ActionResult Profile() => View();   // still protected
}

// Custom authorisation logic
public class OwnerOnlyAttribute : AuthorizeAttribute
{
    protected override bool AuthorizeCore(HttpContextBase httpContext)
    {
        if (!base.AuthorizeCore(httpContext)) return false;
        var id = httpContext.Request.RequestContext.RouteData.Values["id"];
        return OrderService.IsOwnedBy(id, httpContext.User.Identity.Name);
    }
}`, lang: "csharp" },
        { note: "`[Authorize]` runs before the action, so it cannot see model-bound parameters. For record-level checks (\"can this user edit *this* order?\") either read `RouteData` as above, or do the check inside the action.", kind: "warn" }
      ]
    },

    {
      id: "actionname-attribute",
      q: "What is the purpose of the ActionName attribute?",
      tldr: "It decouples the action's route name from the C# method name, which is how you give two same-named actions distinct methods or expose a URL that is not a valid identifier.",
      tags: ["controllers", "routing"],
      a: [
        { ul: [
          "`[ActionName(\"Delete\")]` makes a method named `DeleteConfirmed` respond to `/Products/Delete`.",
          "The classic use is the **GET/POST Delete pair**: both need the URL `Delete`, but C# will not let two methods have the same name and parameter list.",
          "It also lets a URL segment contain characters that are illegal in a C# identifier, such as `View-All`.",
          "Once renamed, the **view lookup uses the action name**, so `View()` looks for `Delete.cshtml`, not `DeleteConfirmed.cshtml`."
        ] },
        { code: `[HttpGet]
public ActionResult Delete(int id)             // GET /Products/Delete/5
{
    return View(_repo.Find(id));               // renders Delete.cshtml
}

[HttpPost, ActionName("Delete")]               // POST /Products/Delete/5
[ValidateAntiForgeryToken]
public ActionResult DeleteConfirmed(int id)
{
    _repo.Delete(id);
    return RedirectToAction("Index");
}

[ActionName("View-All")]                       // /Products/View-All
public ActionResult ViewAll() => View("ViewAll");`, lang: "csharp" },
        { note: "Note the second case: after `[ActionName(\"View-All\")]`, a bare `View()` would look for `View-All.cshtml`. Name the view explicitly, as above.", kind: "warn" }
      ]
    },

    {
      id: "multiple-submit-buttons",
      q: "How do you handle multiple submit buttons in a single form in ASP.NET MVC?",
      tldr: "Give the buttons the same name and different values and branch on the parameter, or use a custom ActionNameSelectorAttribute to route each button to its own action.",
      tags: ["forms"],
      seeAlso: ["mvc-advanced/multiple-submit-buttons"],
      a: [
        { p: "**1. Same name, different value — simplest:**" },
        { code: `<button type="submit" name="command" value="Save">Save</button>
<button type="submit" name="command" value="SaveAndNew">Save and add another</button>
<button type="submit" name="command" value="Cancel">Cancel</button>`, lang: "razor" },
        { code: `[HttpPost]
[ValidateAntiForgeryToken]
public ActionResult Edit(ProductViewModel model, string command)
{
    if (command == "Cancel") return RedirectToAction("Index");
    if (!ModelState.IsValid) return View(model);

    _service.Save(model);
    return command == "SaveAndNew"
        ? RedirectToAction("Create")
        : RedirectToAction("Index");
}`, lang: "csharp" },
        { p: "**2. A selector attribute — one action per button, no branching:**" },
        { code: `public class SubmitButtonAttribute : ActionNameSelectorAttribute
{
    public string ButtonName { get; set; }

    public override bool IsValidName(ControllerContext context,
                                     string actionName, MethodInfo method)
        => context.HttpContext.Request.Form[ButtonName] != null;
}

[HttpPost, SubmitButton(ButtonName = "Save")]
public ActionResult Save(ProductViewModel model) { ... }

[HttpPost, SubmitButton(ButtonName = "Delete")]
public ActionResult Delete(ProductViewModel model) { ... }`, lang: "csharp" },
        { code: `<button type="submit" name="Save">Save</button>
<button type="submit" name="Delete">Delete</button>`, lang: "razor" },
        { note: "With `<input type=\"submit\">` the visible text and the submitted value are the same attribute, which breaks under localisation. `<button type=\"submit\" value=\"...\">Label</button>` keeps them separate — prefer it.", kind: "tip" }
      ]
    },

    {
      id: "displayfor-editorfor",
      q: "What is the purpose of the DisplayFor and EditorFor HTML helpers?",
      tldr: "They render a property using templates chosen from its type and data annotations — DisplayFor read-only, EditorFor as an input — and both can be overridden with your own templates.",
      tags: ["views", "razor"],
      a: [
        { ul: [
          "**`DisplayFor`** emits read-only output; **`EditorFor`** emits the appropriate input control.",
          "The template is picked from the property's **type** and its **`[DataType]`/`[UIHint]`** annotation — `DataType.MultilineText` gives a `<textarea>`, `bool` gives a checkbox, `DateTime` gives a date input.",
          "They respect `[DisplayFormat]`, `[Display]` and `[ReadOnly]`, and `EditorFor` emits the `data-val-*` attributes for client-side validation.",
          "Override them by adding a template in **`/Views/Shared/DisplayTemplates/`** or **`/Views/Shared/EditorTemplates/`** named after the type or the `UIHint`.",
          "`DisplayForModel()` / `EditorForModel()` render the whole model at once.",
          "Unlike `TextBoxFor`, they are **type-aware** — that is the reason to prefer them."
        ] },
        { code: `public class Product
{
    [Display(Name = "Product name")]
    public string Name { get; set; }

    [DataType(DataType.MultilineText)]
    public string Description { get; set; }

    [DisplayFormat(DataFormatString = "{0:C}", ApplyFormatInEditMode = false)]
    public decimal Price { get; set; }

    [UIHint("Rating")]                       // uses EditorTemplates/Rating.cshtml
    public int Stars { get; set; }
}`, lang: "csharp" },
        { code: `@Html.LabelFor(m => m.Name)
@Html.EditorFor(m => m.Name)              @* <input type="text" ... /> *@
@Html.ValidationMessageFor(m => m.Name)

@Html.EditorFor(m => m.Description)       @* <textarea> *@
@Html.DisplayFor(m => m.Price)            @* formatted as currency *@`, lang: "razor" },
        { code: `@* /Views/Shared/EditorTemplates/Rating.cshtml *@
@model int
<select name="@ViewData.TemplateInfo.GetFullHtmlFieldName("")">
    @for (var i = 1; i <= 5; i++)
    {
        <option value="@i" selected="@(i == Model)">@i</option>
    }
</select>`, lang: "razor" }
      ]
    },

    {
      id: "model-validation",
      q: "How do you perform model validation in ASP.NET MVC?",
      tldr: "The binder runs the model's validation attributes automatically and fills ModelState; the action checks ModelState.IsValid and redisplays the view with errors on failure.",
      tags: ["validation"],
      seeAlso: ["mvc-basic/validation", "mvc-intermediate/custom-validation", "mvc-intermediate/validation-summary"],
      a: [
        { p: "The sequence on every POST:" },
        { ol: [
          "**Model binding** populates the parameter from the request.",
          "Binding errors (a letter typed into an `int`) are added to `ModelState` immediately.",
          "The **validation providers** run every `ValidationAttribute` on the model, then `IValidatableObject.Validate` if implemented.",
          "The action inspects **`ModelState.IsValid`**.",
          "On failure, return the same view with the same model so the user keeps their input and sees the messages."
        ] },
        { code: `[HttpPost]
[ValidateAntiForgeryToken]
public ActionResult Edit(ProductViewModel model)
{
    // Business rules the attributes cannot express
    if (model.Price < model.Cost)
        ModelState.AddModelError(nameof(model.Price),
                                 "Price cannot be below cost.");

    if (!ModelState.IsValid)
    {
        model.Categories = _repo.CategorySelectList();   // repopulate dropdowns
        return View(model);
    }

    _service.Update(model);
    TempData["Message"] = "Saved.";
    return RedirectToAction("Index");
}`, lang: "csharp" },
        { ul: [
          "**Repopulating select lists** before returning the view is the step people forget — otherwise the redisplayed form has empty dropdowns.",
          "`ModelState.AddModelError(\"\", \"...\")` adds a form-level error shown by `ValidationSummary(true)`.",
          "`ModelState.Remove(key)` drops an error you do not want, and `TryValidateModel(obj)` validates something you constructed yourself.",
          "**Client-side validation never replaces server-side** — it can be bypassed entirely."
        ] }
      ]
    },

    {
      id: "viewmodel",
      q: "What is a ViewModel in ASP.NET MVC?",
      tldr: "A class shaped for exactly one view — carrying only the data that screen needs, plus its display and validation metadata — rather than exposing a domain entity.",
      tags: ["models", "design"],
      seeAlso: ["mvc-basic/model"],
      a: [
        { ul: [
          "**Prevents over-posting** — the binder can only set the properties you declared, so an attacker cannot inject `IsAdmin=true`.",
          "**Combines several sources** — one screen often needs an entity plus dropdown lists plus flags; an entity cannot express that.",
          "**Carries view concerns** — `[Display]` names, formats and validation messages belong here, not on a persistence entity.",
          "**Decouples UI from the database** — changing a column does not automatically change the form.",
          "**Avoids serialization problems** — no lazy-loading proxies or circular navigation properties."
        ] },
        { code: `public class ProductEditViewModel
{
    public int Id { get; set; }

    [Required, StringLength(100)]
    [Display(Name = "Product name")]
    public string Name { get; set; }

    [Range(0.01, 1000000)]
    [DataType(DataType.Currency)]
    public decimal Price { get; set; }

    [Display(Name = "Category")]
    public int CategoryId { get; set; }

    // View concerns that do not belong on the entity
    public IEnumerable<SelectListItem> Categories { get; set; }
    public bool CanDelete { get; set; }
    public string PageTitle => Id == 0 ? "New product" : "Edit " + Name;
}`, lang: "csharp" },
        { code: `// Entity -> view model on the way out
var vm = new ProductEditViewModel
{
    Id = p.Id, Name = p.Name, Price = p.Price, CategoryId = p.CategoryId,
    Categories = _repo.CategorySelectList(),
    CanDelete = !p.HasOrders
};`, lang: "csharp" },
        { note: "If asked \"isn't that a lot of duplication?\" — yes, and it is deliberate. The entity serves persistence, the view model serves one screen, and the two change for different reasons. AutoMapper removes most of the typing.", kind: "tip" }
      ]
    },

    {
      id: "return-json",
      q: "How do you return JSON data from a controller in ASP.NET MVC?",
      tldr: "Return Json(data) — and for a GET you must pass JsonRequestBehavior.AllowGet, because MVC blocks JSON over GET by default.",
      tags: ["ajax", "json"],
      a: [
        { code: `[HttpGet]
public ActionResult Search(string term)
{
    var data = _repo.Search(term)
                    .Select(p => new { p.Id, p.Name, p.Price })   // shape it
                    .ToList();

    return Json(data, JsonRequestBehavior.AllowGet);   // required for GET
}

[HttpPost]
public ActionResult Save(ProductViewModel model)
{
    if (!ModelState.IsValid)
    {
        Response.StatusCode = 400;
        return Json(new
        {
            success = false,
            errors = ModelState.Where(e => e.Value.Errors.Any())
                               .ToDictionary(e => e.Key,
                                             e => e.Value.Errors
                                                   .Select(x => x.ErrorMessage))
        });
    }

    return Json(new { success = true, id = _service.Save(model) });
}

// Large payloads: raise the default 4 MB serializer limit
public ActionResult Big()
    => new JsonResult
       {
           Data = data,
           MaxJsonLength = int.MaxValue,
           JsonRequestBehavior = JsonRequestBehavior.AllowGet
       };`, lang: "csharp" },
        { ul: [
          "**`JsonRequestBehavior.AllowGet`** is mandatory for GET. The default block exists because of a JSON hijacking attack on older browsers.",
          "**Never return entities directly** — project to an anonymous type or DTO to avoid circular references and over-fetching.",
          "The built-in `JavaScriptSerializer` has a **4 MB default limit** and serialises `DateTime` in the awkward `/Date(...)/` format. For anything non-trivial, return a `ContentResult` with `Newtonsoft.Json` or `System.Text.Json` output.",
          "For a real API, use **Web API / ApiController** rather than MVC actions — you get content negotiation for free."
        ] }
      ]
    },

    {
      id: "partial-vs-renderpartial",
      q: "What is the difference between Html.Partial and Html.RenderPartial?",
      tldr: "Partial returns an MvcHtmlString you output with @; RenderPartial writes straight to the response stream and returns void, which is slightly faster.",
      tags: ["views", "performance"],
      seeAlso: ["mvc-intermediate/partial-views", "mvc-intermediate/html-renderaction"],
      a: [
        { table: { head: ["", "`Html.Partial`", "`Html.RenderPartial`"], rows: [
          ["Returns", "`MvcHtmlString`", "`void`"],
          ["Writes to", "A string, then the response", "The response stream directly"],
          ["Syntax", "`@Html.Partial(\"_X\")`", "`@{ Html.RenderPartial(\"_X\"); }`"],
          ["Performance", "Slightly slower — builds a string", "Slightly faster — no intermediate buffer"],
          ["Assignable to a variable", "Yes", "No"]
        ] } },
        { code: `@* Partial — an expression, usable inline *@
@Html.Partial("_ProductRow", item)

@{ var html = Html.Partial("_ProductRow", item); }   @* can be captured *@

@* RenderPartial — a statement, must be in a code block *@
@{ Html.RenderPartial("_ProductRow", item); }`, lang: "razor" },
        { ul: [
          "The same distinction applies to **`Html.Action` vs `Html.RenderAction`**.",
          "The performance difference is genuinely small — it only matters inside a large loop.",
          "Use **`Partial`** when you need the markup as a value; **`RenderPartial`** when you are just emitting it.",
          "In **ASP.NET Core** prefer `<partial name=\"_X\" model=\"item\" />` or `await Html.PartialAsync(...)` — the synchronous helpers are discouraged there."
        ] }
      ]
    },

    {
      id: "handle-exceptions",
      q: "How do you handle exceptions in ASP.NET MVC?",
      tldr: "Layer it: try/catch for recoverable failures, a global exception filter for logging and a friendly result, Application_Error as the backstop, and customErrors for status pages.",
      tags: ["errors"],
      seeAlso: ["mvc-basic/error-handling", "mvc-advanced/custom-error-handling"],
      a: [
        { table: { head: ["Layer", "Handles", "Registered"], rows: [
          ["`try`/`catch`", "Expected, recoverable failures", "In the action"],
          ["`[HandleError]`", "Unhandled action exceptions → `Error.cshtml`", "Attribute or `FilterConfig`"],
          ["`IExceptionFilter`", "Log, then choose a result", "`FilterConfig` (global)"],
          ["`Controller.OnException`", "One controller's exceptions", "Override in the controller"],
          ["`Application_Error`", "Anything the filters missed", "`Global.asax`"],
          ["`<customErrors>` / `<httpErrors>`", "HTTP status pages (404, 500)", "`web.config`"]
        ] } },
        { code: `public class GlobalExceptionFilter : IExceptionFilter
{
    public void OnException(ExceptionContext ctx)
    {
        if (ctx.ExceptionHandled) return;

        Logger.Error(ctx.Exception, "Unhandled in {0}/{1}",
            ctx.RouteData.Values["controller"], ctx.RouteData.Values["action"]);

        var isAjax = ctx.HttpContext.Request.IsAjaxRequest();
        ctx.Result = isAjax
            ? (ActionResult)new JsonResult
              {
                  Data = new { error = "An unexpected error occurred." },
                  JsonRequestBehavior = JsonRequestBehavior.AllowGet
              }
            : new ViewResult
              {
                  ViewName = "Error",
                  ViewData = new ViewDataDictionary(
                      new HandleErrorInfo(ctx.Exception,
                          (string)ctx.RouteData.Values["controller"],
                          (string)ctx.RouteData.Values["action"]))
              };

        ctx.ExceptionHandled = true;
        ctx.HttpContext.Response.StatusCode = 500;
        ctx.HttpContext.Response.TrySkipIisCustomErrors = true;
    }
}

// FilterConfig.cs
filters.Add(new GlobalExceptionFilter());`, lang: "csharp" },
        { note: "Two details that bite: set `TrySkipIisCustomErrors = true` or IIS replaces your error page with its own, and remember `[HandleError]` does no logging at all and ignores AJAX requests.", kind: "warn" }
      ]
    },

    {
      id: "viewdata-dictionary",
      q: "What is the purpose of the ViewData dictionary?",
      tldr: "A string-keyed dictionary of objects for passing incidental data from controller to view within a single request — the storage that ViewBag wraps dynamically.",
      tags: ["state"],
      seeAlso: ["mvc-basic/viewbag-viewdata", "mvc-basic/viewbag-vs-viewdata-vs-tempdata"],
      a: [
        { ul: [
          "Type is `ViewDataDictionary`, deriving from `IDictionary<string, object>` — so reads need a **cast**.",
          "`ViewBag` is a `dynamic` façade over the **same instance**, so the two are interchangeable.",
          "Lives for the **current request only** — gone after a redirect.",
          "It also carries `ViewData.Model` and `ViewData.ModelState`, which is how the model and validation state reach the view.",
          "A partial view inherits the parent's `ViewData` unless you pass a new dictionary — which **replaces** it."
        ] },
        { code: `public ActionResult Edit(int id)
{
    ViewData["PageTitle"] = "Edit product";
    ViewData["Categories"] = new SelectList(_repo.Categories(), "Id", "Name");
    return View(_repo.Find(id));
}`, lang: "csharp" },
        { code: `<h2>@ViewData["PageTitle"]</h2>

@{ var cats = ViewData["Categories"] as SelectList; }
@Html.DropDownList("CategoryId", cats)

@* Missing keys return null rather than throwing *@
@if (ViewData["Warning"] != null) { <p>@ViewData["Warning"]</p> }`, lang: "razor" },
        { note: "A missing key returns `null` rather than throwing, so a typo produces silently blank output. That, plus the casts, is the argument for a strongly typed view model.", kind: "warn" }
      ]
    },

    {
      id: "logging",
      q: "How do you implement logging in ASP.NET MVC?",
      tldr: "Use a logging library (Serilog, NLog, log4net, or ILogger in Core) behind an injected abstraction, and log through a global exception filter plus explicit calls at the boundaries.",
      tags: ["diagnostics"],
      a: [
        { code: `// Serilog, configured once at startup
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .Enrich.FromLogContext()
    .WriteTo.File("logs/app-.log", rollingInterval: RollingInterval.Day)
    .WriteTo.Seq("http://localhost:5341")
    .CreateLogger();`, lang: "csharp" },
        { code: `public class OrdersController : Controller
{
    private readonly ILogger _logger;
    public OrdersController(ILogger logger) => _logger = logger;

    [HttpPost]
    public ActionResult Place(OrderViewModel model)
    {
        // Structured logging: the properties stay queryable, not baked into text
        _logger.Information("Placing order for {CustomerId} totalling {Total}",
                            model.CustomerId, model.Total);
        try
        {
            var id = _service.Place(model);
            _logger.Information("Order {OrderId} placed", id);
            return RedirectToAction("Confirmation", new { id });
        }
        catch (PaymentException ex)
        {
            _logger.Warning(ex, "Payment declined for {CustomerId}",
                            model.CustomerId);
            ModelState.AddModelError("", "Payment was declined.");
            return View(model);
        }
    }
}`, lang: "csharp" },
        { table: { head: ["Level", "Use for"], rows: [
          ["Trace / Debug", "Development detail, off in production"],
          ["Information", "Business events worth auditing"],
          ["Warning", "Recoverable problems, degraded behaviour"],
          ["Error", "A request failed"],
          ["Fatal / Critical", "The application cannot continue"]
        ] } },
        { ul: [
          "**Log exceptions once**, in a global filter or `Application_Error` — logging and rethrowing at every layer produces noise.",
          "**Structured logging** with named properties beats string concatenation: you can query on `OrderId` later.",
          "Attach a **correlation id** per request so all the entries for one request can be pulled together.",
          "**Never log secrets** — passwords, tokens, card numbers, or full personal data.",
          "In **ASP.NET Core**, `ILogger<T>` is built in and any provider plugs in behind it."
        ] }
      ]
    },

    {
      id: "validation-summary",
      q: "What is the purpose of the Html.ValidationSummary helper?",
      tldr: "It renders a list of the current ModelState errors — either all of them, or only the form-level ones not tied to a specific field.",
      tags: ["validation", "views"],
      seeAlso: ["mvc-intermediate/model-validation"],
      a: [
        { code: `@* All errors, including per-property ones *@
@Html.ValidationSummary(false)

@* Only errors NOT tied to a property — the usual pairing with per-field messages *@
@Html.ValidationSummary(true)

@* With a heading and a CSS class *@
@Html.ValidationSummary(true, "Please fix the following:",
                        new { @class = "alert alert-danger" })`, lang: "razor" },
        { code: `// Property-level error -> next to the field
ModelState.AddModelError(nameof(model.Email), "That email is already in use.");

// Form-level error -> shown by ValidationSummary(true)
ModelState.AddModelError("", "Your session expired, please try again.");`, lang: "csharp" },
        { ul: [
          "**`excludePropertyErrors: true`** is the common choice: the summary shows only general errors, and `@Html.ValidationMessageFor` shows each field's error beside it. Otherwise every message appears twice.",
          "Errors added with an **empty key** are the model-level ones.",
          "It renders `validation-summary-errors` when there are errors and `validation-summary-valid` when there are none, so it can be styled or hidden with CSS.",
          "With unobtrusive validation loaded, it also updates live on the client."
        ] }
      ]
    },

    {
      id: "filters",
      q: "Explain the concept of Filters in ASP.NET MVC.",
      tldr: "Filters inject cross-cutting logic into the request pipeline at defined points — authorisation, action, result and exception — applied by attribute at action, controller or global level.",
      tags: ["filters", "architecture"],
      seeAlso: ["mvc-basic/action-filters", "mvc-advanced/custom-action-filter", "mvc-advanced/iresultfilter"],
      a: [
        { table: { head: ["Filter type", "Interface", "Runs", "Built-in example"], rows: [
          ["**Authorization**", "`IAuthorizationFilter`", "First, before model binding", "`[Authorize]`, `[RequireHttps]`"],
          ["**Action**", "`IActionFilter`", "Before and after the action", "`[ValidateAntiForgeryToken]`"],
          ["**Result**", "`IResultFilter`", "Before and after the result executes", "`[OutputCache]`"],
          ["**Exception**", "`IExceptionFilter`", "When an unhandled exception occurs", "`[HandleError]`"]
        ] } },
        { p: "Execution order for one request:" },
        { code: `Authorization filters
  -> Action filters      OnActionExecuting
       -> ACTION METHOD RUNS
  -> Action filters      OnActionExecuted
  -> Result filters      OnResultExecuting
       -> RESULT EXECUTES (view renders)
  -> Result filters      OnResultExecuted
(Exception filters run at any point if something throws)`, lang: "text" },
        { code: `public class TimingFilter : ActionFilterAttribute
{
    private const string Key = "__timer";

    public override void OnActionExecuting(ActionExecutingContext c)
        => c.HttpContext.Items[Key] = Stopwatch.StartNew();

    public override void OnResultExecuted(ResultExecutedContext c)
    {
        var sw = (Stopwatch)c.HttpContext.Items[Key];
        Logger.Info($"{c.RouteData.Values["action"]} took {sw.ElapsedMilliseconds} ms");
    }
}

// Scope, widest to narrowest
GlobalFilters.Filters.Add(new TimingFilter());   // every action
[TimingFilter] public class HomeController { }   // every action here
[TimingFilter] public ActionResult Index() { }   // just this one`, lang: "csharp" },
        { ul: [
          "Scope order on the way **in** is global → controller → action, and reverses on the way out.",
          "`Order` on the attribute overrides that; lower runs first.",
          "Setting `filterContext.Result` in `OnActionExecuting` **short-circuits** the action entirely.",
          "In **ASP.NET Core** there is a fifth type, **resource filters**, and filters can be dependency-injected with `[TypeFilter]` or `[ServiceFilter]`."
        ] }
      ]
    }

  ]
});
