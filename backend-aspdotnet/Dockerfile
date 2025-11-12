# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app

# Copy everything into /app (since .sln and .csproj are in same dir)
COPY . .

# Restore, build, and publish

RUN mkdir -p /app/StartData/Avatars
COPY StartData/Avatars /app/StartData/Avatars

RUN dotnet restore
RUN dotnet publish -c Release -o /app/publish

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

COPY --from=build /app/StartData/Avatars ./StartData/Avatars

ENTRYPOINT ["dotnet", "backend-aspdotnet.dll"]
