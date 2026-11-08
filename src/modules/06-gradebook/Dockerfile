# Stage 1: Build the C# API
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build

WORKDIR /src

# Copy project file and restore dependencies
COPY Gradebook/GradebookAPI/GradebookAPI.csproj Gradebook/GradebookAPI/
RUN dotnet restore Gradebook/GradebookAPI/GradebookAPI.csproj

# Copy the source files and publish
COPY Gradebook/GradebookAPI/ Gradebook/GradebookAPI/
RUN dotnet publish Gradebook/GradebookAPI/GradebookAPI.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

# Stage 2: Run the compiled API
FROM mcr.microsoft.com/dotnet/aspnet:8.0

WORKDIR /app

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080

EXPOSE 8080

ENTRYPOINT ["dotnet", "GradebookAPI.dll"]