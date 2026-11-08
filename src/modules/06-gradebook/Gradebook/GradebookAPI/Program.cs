var builder = WebApplication.CreateBuilder(args);

// Register controller support
builder.Services.AddControllers();

var app = builder.Build();

// Enable controller routes
app.MapControllers();

// Health check endpoint
app.MapGet("/health", () =>
{
    return Results.Ok(new
    {
        status = "Gradebook API running"
    });
});

app.Run();