# --- Build stage ---
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B -DskipTests package

# --- Run stage ---
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
# uploaded files live here (mount a volume in production)
RUN mkdir -p /app/uploads
EXPOSE 8080
ENV UPLOAD_DIR=/app/uploads
ENTRYPOINT ["java", "-jar", "app.jar"]
