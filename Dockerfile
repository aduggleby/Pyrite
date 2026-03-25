FROM node:25-alpine AS frontend-build
WORKDIR /src

COPY src/pyrite-web/package.json src/pyrite-web/package-lock.json ./src/pyrite-web/
RUN cd src/pyrite-web && npm ci

COPY src/pyrite-web ./src/pyrite-web
RUN cd src/pyrite-web && npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend-build
WORKDIR /src

COPY Pyrite.slnx ./
COPY src/Pyrite.Api ./src/Pyrite.Api
COPY tests/Pyrite.Api.Tests ./tests/Pyrite.Api.Tests
COPY --from=frontend-build /src/src/Pyrite.Api/wwwroot ./src/Pyrite.Api/wwwroot

RUN dotnet restore Pyrite.slnx
RUN dotnet publish ./src/Pyrite.Api/Pyrite.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

COPY --from=backend-build /app/publish ./

ENV ASPNETCORE_URLS=http://+:18100
EXPOSE 18100

ENTRYPOINT ["dotnet", "Pyrite.Api.dll"]
