import { Logging } from "@google-cloud/logging";
import { container } from "tsyringe";

container.register("Logging", {
  useFactory: () => new Logging(),
});
